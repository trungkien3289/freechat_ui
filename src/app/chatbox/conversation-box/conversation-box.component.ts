import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ContactMessage,
  ContactMessageGroup,
  ContactMessageViewItem,
  ConversationItemType,
  SendStatus,
} from '../../models/contact-message.model';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first, last } from 'lodash';
import { Utils } from '../../utilities/utils';
import { v4 as uuidv4 } from 'uuid';
import { GroupContactCacheService } from '../../services/group-contact-cache.service';
import { debounce } from 'lodash';

const INTERVAL_RELOAD_CHATBOX = 5000;
@Component({
  selector: 'app-conversation-box',
  templateUrl: './conversation-box.component.html',
  styleUrl: './conversation-box.component.scss',
})
export class ConversationBoxComponent implements OnDestroy, AfterViewChecked {
  _last = last;
  _first = first;
  @Input() set contact(contactGroup: ContactMessageGroup | undefined) {
    if (!!contactGroup) {
      this.resetChatBox();
      this.contactGroup = contactGroup;
      let updatedMessages = [
        ...contactGroup.messages,
        ...this._GroupContactCacheService.getGroupUnsentMessage(
          this.contactGroup.id
        ),
      ];

      this.messageViewItems = this.mapToMessageViewItems(updatedMessages);

      this.startFetchMessageInterval(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.currentPhoneNumber.phoneNumber,
        this._first(
          [...this.contactGroup.to, this.contactGroup.from].filter(
            (n) => !n.own
          )
        )?.TN || ''
      );
    }
  }
  @Output() sendMessageSuccess = new EventEmitter<void>();
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messageViewItems: ContactMessageViewItem[] = [];
  contactGroup!: ContactMessageGroup;
  isLoading: boolean = false;
  fetchMessageInterval: any;
  reTryError: number = 10;
  myForm: FormGroup;
  isFirstLoad: boolean = true;
  isSubmitting = false;

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder,
    private _GroupContactCacheService: GroupContactCacheService
  ) {
    this.myForm = this._FormBuilder.group({
      textInput: ['', Validators.required],
    });
  }
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.resetChatBox();
  }

  startFetchMessageInterval = (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string
  ) => {
    this.fetchMessageInterval = setInterval(async () => {
      try {
        this.isLoading = true;
        let messages = await this._ChatService.fetchMessages(
          fromPhoneNumberId,
          fromPhoneNumber,
          toPhoneNumber
        );
        let notSendMessages =
          this._GroupContactCacheService.getGroupUnsentMessage(
            this.contactGroup.id
          );
        this.messageViewItems = this.mapToMessageViewItems([
          ...messages,
          ...notSendMessages,
        ]);

        this.scrollToBottom();
        if (this.isFirstLoad) {
          this.isFirstLoad = false;
          this.sendMessageSuccess.emit();
        }
      } catch (error: any) {
        this.reTryError--;
        console.error(error);
        if (this.reTryError === 0) {
          this._NotificationService.error(error);
          this.resetChatBox();
        }
      }

      this.isLoading = false;
    }, INTERVAL_RELOAD_CHATBOX);
  };

  stopFetchMessageInterval = () => {
    clearInterval(this.fetchMessageInterval);
  };

  fetchMessages = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string
  ) => {
    try {
      let messages = await this._ChatService.fetchMessages(
        fromPhoneNumberId,
        fromPhoneNumber,
        toPhoneNumber
      );

      let notSendMessages =
        this._GroupContactCacheService.getGroupUnsentMessage(
          this.contactGroup.id
        );
      this.messageViewItems = this.mapToMessageViewItems([
        ...messages,
        ...notSendMessages,
      ]);

      this.scrollToBottom();
    } catch (error: any) {}
  };

  resetChatBox = () => {
    clearInterval(this.fetchMessageInterval);
    this.messageViewItems = [];
    this.reTryError = 10;
    this.myForm.reset();
  };

  sendMessageBtnClick = () => {
    this.debouncedSubmit();
  };

  debouncedSubmit = debounce(async () => {
    if (!this.myForm.valid) return;
    this.stopFetchMessageInterval();
    this.isLoading = true;
    let newMessage: ContactMessage = this.addMessageToGroup(
      this.myForm.value.textInput
    );

    this.myForm.reset();

    try {
      await this._ChatService.sendMessage(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        newMessage.text
      );

      this.updateMessageStatus(newMessage.id, SendStatus.SENT);
      this.sendMessageSuccess.emit();

      //force fetch messages
      this.fetchMessages(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.currentPhoneNumber.phoneNumber,
        this.contactGroup.isOutgoing
          ? this.contactGroup.to[0].TN
          : this.contactGroup.from.TN
      );
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
    }

    this.isLoading = false;
    this.scrollToBottom();
    this.startFetchMessageInterval(
      this.contactGroup.currentPhoneNumber.id,
      this.contactGroup.currentPhoneNumber.phoneNumber,
      this._first(
        [...this.contactGroup.to, this.contactGroup.from].filter((n) => !n.own)
      )?.TN || ''
    );
  }, 200);

  addMessageToGroup = (message: string): ContactMessage => {
    let newMessage = {
      id: uuidv4(),
      myStatus: 'READ',
      timeCreated: new Date().toISOString(),
      direction: 'out',
      isOutgoing: true,
      text: message,
      sendStatus: SendStatus.SENDING,
    } as ContactMessage;

    this.contactGroup.messages.push(newMessage);

    this.messageViewItems.push({
      ...newMessage,
      itemType: ConversationItemType.MESSAGE,
      formattedTime: Utils.formatTime(newMessage.timeCreated),
    } as ContactMessageViewItem);

    this._GroupContactCacheService.cacheGroupUnsentMessage(
      this.contactGroup.id,
      this.contactGroup.messages.filter(
        (mess) => mess.sendStatus != SendStatus.SENT
      )
    );

    return newMessage;
  };

  updateMessageStatus = (messageId: string, status: SendStatus) => {
    let message = this.contactGroup.messages.find(
      (item) => item.id === messageId
    );
    if (!!message) {
      message.sendStatus = status;
      // if (this.isNewGroupConversation) {
      //   this._LocalStorageService.setItem(
      //     `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
      //     this.contactGroup
      //   );
      // }
    }

    let messageViewItem = this.messageViewItems.find(
      (item) => item.id === messageId
    );

    if (!!messageViewItem) {
      messageViewItem.sendStatus = status;
    }

    this._GroupContactCacheService.cacheGroupUnsentMessage(
      this.contactGroup.id,
      this.contactGroup.messages.filter(
        (mess) => mess.sendStatus != SendStatus.SENT
      )
    );
  };

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Prevents default Enter behavior
      event.preventDefault();
      // Submit the form if it's valid
      if (this.myForm.valid) {
        this.sendMessageBtnClick();
      }
    }
  }

  mapToMessageViewItems = (
    messages: ContactMessage[]
  ): ContactMessageViewItem[] => {
    let orderedMessages = messages.map((item) => {
      return {
        ...item,
        sendStatus: item.sendStatus || SendStatus.SENT,
        itemType: ConversationItemType.MESSAGE,
        formattedTime: Utils.formatTime(item.timeCreated),
      } as ContactMessageViewItem;
    });
    orderedMessages.sort((a, b) => {
      return (
        new Date(a.timeCreated.split('.')[0]).getTime() -
        new Date(b.timeCreated.split('.')[0]).getTime()
      );
    });

    orderedMessages = this.addGroupByDateSeparator(orderedMessages);

    return orderedMessages;
  };

  addGroupByDateSeparator = (sortedMessages: ContactMessageViewItem[]) => {
    const result: ContactMessageViewItem[] = [];
    let previousDate: string | null = null;

    sortedMessages.forEach((item) => {
      // Convert the date to YYYY-MM-DD format for easier comparison
      const currentDate = new Date(item.timeCreated)
        .toISOString()
        .split('T')[0];

      // If there is a date change, add a separator item
      if (previousDate !== currentDate) {
        result.push({
          itemType: ConversationItemType.DATE_GROUP_SEPARATE_LINE,
          formattedTime: currentDate,
        } as ContactMessageViewItem);
      }

      // Add the current item to the result list
      result.push(item);

      // Update previousDate to the current item’s date
      previousDate = currentDate;
    });

    return result;
  };

  private scrollToBottom(): void {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }
}
