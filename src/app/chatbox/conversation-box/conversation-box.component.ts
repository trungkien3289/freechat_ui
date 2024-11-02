import { Component, Input, OnDestroy } from '@angular/core';
import {
  ContactMessage,
  ContactMessageGroup,
  ContactMessageViewItem,
} from '../../models/contact-message.model';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ca } from 'date-fns/locale';
import { filter, first, last } from 'lodash';

@Component({
  selector: 'app-conversation-box',
  templateUrl: './conversation-box.component.html',
  styleUrl: './conversation-box.component.scss',
})
export class ConversationBoxComponent implements OnDestroy {
  _last = last;
  _first = first;
  @Input() set contact(contactGroup: ContactMessageGroup | undefined) {
    if (!!contactGroup) {
      this.resetChatBox();
      this.contactGroup = contactGroup;
      this.messageViewItems = contactGroup.messages.map((item) => {
        return {
          ...item,
          formattedTime: this.formatTime(item.timeCreated),
        } as ContactMessageViewItem;
      });

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

  messageViewItems: ContactMessageViewItem[] = [];
  contactGroup!: ContactMessageGroup;
  isLoading: boolean = false;
  fetchMessageInterval: any;
  reTryError: number = 10;

  myForm: FormGroup;

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder
  ) {
    this.myForm = this._FormBuilder.group({
      textInput: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {
    this.resetChatBox();
  }

  formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // e.g., "09:24 AM"
  };

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

        this.messageViewItems = messages.map((item) => {
          return {
            ...item,
            formattedTime: this.formatTime(item.timeCreated),
          } as ContactMessageViewItem;
        });
      } catch (error: any) {
        this.reTryError--;
        console.error(error);
        if (this.reTryError === 0) {
          this._NotificationService.error(error);
          this.resetChatBox();
        }
      }

      this.isLoading = false;
    }, 10000);
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

      this.messageViewItems = messages.map((item) => {
        return {
          ...item,
          formattedTime: this.formatTime(item.timeCreated),
        } as ContactMessageViewItem;
      });
    } catch (error: any) {}
  };

  resetChatBox = () => {
    clearInterval(this.fetchMessageInterval);
    this.messageViewItems = [];
    this.reTryError = 10;
    this.myForm.reset();
  };

  sendMessageBtnClick = () => {
    if (!this.myForm.valid) return;
    try {
      this.isLoading = true;
      this._ChatService.sendMessage(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        this.myForm.value.textInput
      );

      this.myForm.reset();

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
    }

    this.isLoading = false;
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
}
