import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ContactMessage,
  ContactMessageGroup,
  ContactMessageViewItem,
  SendStatus,
} from '../../models/contact-message.model';
import { LocalStorageService } from '../../services/local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { NEW_GROUP_CONVERSATION_ID } from '../../utilities/chatbox.const';
import { Utils } from '../../utilities/utils';
import { debounce } from 'lodash';

@Component({
  selector: 'app-group-conversation-box',
  templateUrl: './group-conversation-box.component.html',
  styleUrl: './group-conversation-box.component.scss',
})
export class GroupConversationBoxComponent implements AfterViewChecked {
  @Output() sendMessageGroupSuccess = new EventEmitter<void>();
  messageViewItems: ContactMessageViewItem[] = [];
  contactGroup!: ContactMessageGroup;
  isLoading: boolean = false;
  fetchMessageInterval: any;
  reTryError: number = 10;
  myForm: FormGroup;
  isNewGroupConversation: boolean = false;

  @Input() set contact(contactGroup: ContactMessageGroup | undefined) {
    if (!!contactGroup) {
      this.resetChatBox();
      this.contactGroup = contactGroup;
      this.isNewGroupConversation =
        contactGroup.id == NEW_GROUP_CONVERSATION_ID;
      this.messageViewItems = contactGroup.messages.map((item) => {
        return {
          ...item,
          sendStatus: item.sendStatus || SendStatus.SENT,
          formattedTime: this.formatTime(item.timeCreated),
        } as ContactMessageViewItem;
      });

      this.listOfTagOptions = contactGroup.to.map((item) => item.TN);
    }
  }
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  listOfTagOptions: string[] = [];
  listOfOption: Array<{ label: string; value: string }> = [];

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder,
    private _LocalStorageService: LocalStorageService
  ) {
    this.myForm = this._FormBuilder.group({
      textInput: ['', Validators.required],
    });
  }
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      this.sendMessageGroupSuccess.emit();
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
    }

    this.isLoading = false;
    this.scrollToBottom();
  }, 200);

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.myForm.valid) {
        this.sendMessageBtnClick();
      }
    }
  }

  onToNumbersChange = (toPhoneNumbers: string[]) => {
    console.log(toPhoneNumbers);
    this.contactGroup.to = toPhoneNumbers.map((phoneNumber) => {
      const numericString = phoneNumber.replace(/\D/g, '');
      return {
        TN: Utils.formatPhoneNumberTN(numericString),
        name: Utils.formatPhoneNumberName(numericString),
      };
    });

    // save to local storage
    if (this.isNewGroupConversation) {
      this._LocalStorageService.setItem(
        `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
        this.contactGroup
      );
    }
  };

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
    if (this.isNewGroupConversation) {
      this._LocalStorageService.setItem(
        `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
        this.contactGroup
      );
    }
    this.messageViewItems.push({
      ...newMessage,
      formattedTime: this.formatTime(newMessage.timeCreated),
    } as ContactMessageViewItem);

    return newMessage;
  };

  updateMessageStatus = (messageId: string, status: SendStatus) => {
    let message = this.contactGroup.messages.find(
      (item) => item.id === messageId
    );
    if (!!message) {
      message.sendStatus = status;
      if (this.isNewGroupConversation) {
        this._LocalStorageService.setItem(
          `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
          this.contactGroup
        );
      }
    }

    let messageViewItem = this.messageViewItems.find(
      (item) => item.id === messageId
    );

    if (!!messageViewItem) {
      messageViewItem.sendStatus = status;
    }
  };

  resetNewGroupConversation = () => {
    if (this.isNewGroupConversation) {
      this.contactGroup.to = [];
      this.contactGroup.messages = [];
      this.messageViewItems = [];
      this.listOfOption = [];
      this.listOfTagOptions = [];
      this._LocalStorageService.setItem(
        `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
        this.contactGroup
      );
    }
  };

  private scrollToBottom(): void {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }
}
