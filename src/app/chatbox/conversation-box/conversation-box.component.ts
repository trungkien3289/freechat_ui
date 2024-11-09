import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
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
import { first, last, set } from 'lodash';
import { Utils } from '../../utilities/utils';
import { v4 as uuidv4 } from 'uuid';
import { GroupContactCacheService } from '../../services/group-contact-cache.service';
import { debounce } from 'lodash';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzButtonType } from 'ng-zorro-antd/button';
import { FileService } from '../../services/file.service';
import { AudioRecordingService } from '../../services/audio-recording.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import _ from 'lodash';
import moment from 'moment';
import { DELAY_FOR_CHECK_NEW_COMMING_MESSAGE } from '../chat-settings.const';

const INTERVAL_RELOAD_CHATBOX = 5000;
const MAX_RECORDING_SECONDS = 60;
@Component({
  selector: 'app-conversation-box',
  templateUrl: './conversation-box.component.html',
  styleUrl: './conversation-box.component.scss',
})
export class ConversationBoxComponent
  implements OnDestroy, AfterViewChecked, AfterViewInit, OnInit
{
  _last = last;
  _first = first;

  @Input() set contact(contactGroup: ContactMessageGroup | undefined) {
    if (!!contactGroup && contactGroup.id !== this.contactGroup?.id) {
      this.resetChatBox();
      this.contactGroup = contactGroup;
      this._GroupContactCacheService.setLastSeen(
        contactGroup.id,
        new Date(),
        contactGroup
      );
      let updatedMessages = [
        ...contactGroup.messages,
        ...this._GroupContactCacheService.getGroupUnsentMessage(
          this.contactGroup.id
        ),
      ];

      this.messageViewItems = this.mapToMessageViewItems(updatedMessages);
      this.scrollToBottom();

      this.stopFetchMessageInterval();
      this.startFetchMessageInterval(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.currentPhoneNumber.phoneNumber,
        this._first(
          [...this.contactGroup.to, this.contactGroup.from].filter(
            (n) => !n.own
          )
        )?.TN || '',
        this.contactGroup.id
      );
    }
  }
  @Output() sendMessageSuccess = new EventEmitter<void>();
  @Output() markPhoneAsDown = new EventEmitter<string>();
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messageViewItems: ContactMessageViewItem[] = [];
  contactGroup!: ContactMessageGroup;
  isLoading: boolean = false;
  fetchMessageInterval: any;
  reTryError: number = 10;
  myForm: FormGroup;
  isFirstLoad: boolean = true;
  isSubmitting = false;

  // upload images
  fileList: NzUploadFile[] = [];
  previewImage: string | undefined = '';
  previewVisible = false;

  // audio recording
  isRecording = false;
  recordedTime: string = '';
  recordingPercentage: number = 0;
  blobUrl: SafeUrl | undefined;
  teste: any;

  // emoji popup
  isEmojiPickerVisible: boolean = false;

  @ViewChild('uploadComponent', { static: false }) uploadComponent!: any;
  fileInput: HTMLInputElement | null = null;

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder,
    private _GroupContactCacheService: GroupContactCacheService,
    private _FileService: FileService,
    private _AudioRecordingService: AudioRecordingService,
    private sanitizer: DomSanitizer
  ) {
    this.myForm = this._FormBuilder.group({
      textInput: ['', Validators.required],
    });

    this._AudioRecordingService
      .recordingFailed()
      .subscribe(() => (this.isRecording = false));
    this._AudioRecordingService.getRecordedTime().subscribe((data) => {
      this.recordedTime = data.timeString;
      this.recordingPercentage = Math.round(
        (data.durationSeconds / MAX_RECORDING_SECONDS) * 100
      );
    });
    this._AudioRecordingService.getRecordedBlob().subscribe((data) => {
      this.teste = data;
      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(data.blob)
      );
    });
  }
  ngOnInit(): void {}
  ngAfterViewInit(): void {
    // Access the native file input element within the nz-upload component
    this.fileInput = this.uploadComponent?.uploadComp?.file?.nativeElement;
  }

  ngAfterViewChecked(): void {
    // this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.resetChatBox();
  }

  startFetchMessageInterval = (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string
  ) => {
    this.fetchMessageInterval = setInterval(async () => {
      try {
        this.isLoading = true;
        const messages = await this.fetchAllMessages(
          fromPhoneNumberId,
          fromPhoneNumber,
          toPhoneNumber,
          groupId
        );

        if (this.isScrollAtBottom()) {
          this.scrollToBottom();
        }

        if (this.contactGroup.messages.length != messages.length) {
          this.sendMessageSuccess.emit();
        }

        if (this.isFirstLoad) {
          this.isFirstLoad = false;
        }

        this._GroupContactCacheService.setLastSeen(
          this.contactGroup.id,
          new Date(),
          this.contactGroup
        );
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

  fetchNewMessages = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string,
    lastMessage?: ContactMessage
  ): Promise<ContactMessage[]> => {
    try {
      let messages = await this._ChatService.fetchNewMessages(
        fromPhoneNumberId,
        fromPhoneNumber,
        toPhoneNumber,
        groupId,
        lastMessage?.timeCreated || '2024-10-24 18:35:52.180564'
      );

      return messages;
    } catch (error: any) {}

    return [];
  };

  fetchAllMessages = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string
  ): Promise<ContactMessage[]> => {
    try {
      let allMessages = await this._ChatService.fetchMessages(
        fromPhoneNumberId,
        fromPhoneNumber,
        toPhoneNumber,
        groupId
      );

      if (allMessages.length > 0) {
        //has new message - send message success
        let notSendMessages =
          this._GroupContactCacheService.getGroupUnsentMessage(
            this.contactGroup.id
          );

        this.messageViewItems = this.mapToMessageViewItems([
          ...allMessages,
          ...notSendMessages,
        ]);
      }

      return allMessages;
    } catch (error: any) {}

    return [];
  };

  resetChatBox = () => {
    clearInterval(this.fetchMessageInterval);
    this.messageViewItems = [];
    this.reTryError = 10;
    this.myForm.reset();
    this.fileList = [];
    this.abortRecording();
  };

  resetUploadImage = () => {
    this.fileList = [];
    this.previewImage = '';
    this.previewVisible = false;
  };

  addEmoji = (event: any) => {
    if (event.emoji.native) {
      let updatedValue = `${this.myForm.value?.textInput || ''}${
        event.emoji.native
      }`;
      this.myForm.patchValue({ textInput: updatedValue });
    }
  };

  sendMessageBtnClick = () => {
    this.debouncedSubmit();
  };

  debouncedSubmit = debounce(async () => {
    if (this.isRecording) return;
    this.stopFetchMessageInterval();
    this.isLoading = true;

    try {
      // If have images upload
      if (this.fileList.length > 0) {
        let uploadFilesRequests = this.fileList.map((file) => {
          return this.sendImageMessage(file.response);
        });

        this.fileList = [];
        await Promise.allSettled(uploadFilesRequests);
      }

      if (this.myForm.valid) {
        let newTextMessage = await this.sendTextMessage(
          this.myForm.value.textInput
        );
      }

      this.sendMessageSuccess.emit();

      let allMessages = await this.fetchAllMessages(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.currentPhoneNumber.phoneNumber,
        this.contactGroup.isOutgoing
          ? this.contactGroup.to[0].TN
          : this.contactGroup.from.TN,
        this.contactGroup.id
      );
    } catch (error) {
      this._NotificationService.error('Send messages failed');
    }

    this.isLoading = false;
    this.scrollToBottom();
    this.startFetchMessageInterval(
      this.contactGroup.currentPhoneNumber.id,
      this.contactGroup.currentPhoneNumber.phoneNumber,
      this._first(
        [...this.contactGroup.to, this.contactGroup.from].filter((n) => !n.own)
      )?.TN || '',
      this.contactGroup.id
    );
  }, 200);

  verifyHasNewMessage = async (): Promise<boolean> => {
    let lastMessage = _.findLast(
      this.contactGroup.messages,
      (mes: ContactMessage) => {
        return mes.sendStatus == SendStatus.SENT && mes.isOutgoing;
      }
    ) as ContactMessage | undefined;
    await Utils.delay(DELAY_FOR_CHECK_NEW_COMMING_MESSAGE);
    let commingMessages = await this.fetchNewMessages(
      this.contactGroup.currentPhoneNumber.id,
      this.contactGroup.currentPhoneNumber.phoneNumber,
      this.contactGroup.isOutgoing
        ? this.contactGroup.to[0].TN
        : this.contactGroup.from.TN,
      this.contactGroup.id,
      lastMessage
    );

    if (commingMessages.length > 0) {
      //has new message - send message success
      return true;
    } else {
      // has no new message - send message failed
      return false;
    }
  };

  sendAudioMessageClick = async () => {
    console.log('send audio message');
    await this.stopRecording();
    if (this.blobUrl) {
      await this.sendAudioMessage(
        this.blobUrl,
        this.teste.blob,
        this.teste.title
      );
    }

    this.abortRecording();
  };

  //#region Send text | image | audio message
  sendImageMessage = async (imageUrl: string): Promise<ContactMessage> => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      '',
      ConversationItemType.IMAGE,
      { image: imageUrl }
    );

    this.scrollToBottom();

    try {
      await this._ChatService.sendImage(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        imageUrl
      );

      let hasNewMessage = await this.verifyHasNewMessage();
      if (hasNewMessage) {
        this.updateMessageStatus(newMessage.id, SendStatus.SENT);
      } else {
        this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
        // Should notify phone number error
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
    }

    this.resetUploadImage();

    return newMessage;
  };

  sendTextMessage = async (message: string): Promise<ContactMessage> => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      message,
      ConversationItemType.MESSAGE
    );

    this.scrollToBottom();

    this.myForm.reset();

    try {
      await this._ChatService.sendMessage(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        newMessage.text
      );

      let hasNewMessage = await this.verifyHasNewMessage();
      if (hasNewMessage) {
        this.updateMessageStatus(newMessage.id, SendStatus.SENT);
      } else {
        this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
        // Should notify phone number error
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
    }

    return newMessage;
  };

  sendAudioMessage = async (
    audioUrl: SafeUrl,
    audioBlob: Blob,
    audioFileName: string
  ): Promise<ContactMessage> => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      '',
      ConversationItemType.AUDIO,
      { audio: audioUrl as string }
    );

    this.scrollToBottom();

    try {
      const audioFile = new File([audioBlob], audioFileName, {
        type: audioBlob.type,
      });
      const fileUrl = await this._FileService.upload(
        audioFile,
        audioFileName,
        ConversationItemType.AUDIO
      );

      await this._ChatService.sendAudio(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        fileUrl
      );

      let hasNewMessage = await this.verifyHasNewMessage();
      if (hasNewMessage) {
        this.updateMessageStatus(newMessage.id, SendStatus.SENT);
      } else {
        this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
        // Should notify phone number error
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
    }

    return newMessage;
  };

  //#endregion

  addMessageToGroup = (
    messageText: string,
    itemType: ConversationItemType,
    media?: { image?: string; audio?: string }
  ): ContactMessage => {
    let newMessage = {
      id: uuidv4(),
      myStatus: 'READ',
      timeCreated: new Date().toString(),
      direction: 'out',
      isOutgoing: true,
      text: messageText,
      sendStatus: SendStatus.SENDING,
      itemType: itemType,
      media: media,
    } as ContactMessage;

    this.contactGroup.messages.push(newMessage);

    this.messageViewItems.push({
      ...newMessage,
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
      this.isEmojiPickerVisible = false;
      // Submit the form if it's valid
      this.sendMessageBtnClick();
    }
  }

  mapToMessageViewItems = (
    messages: ContactMessage[]
  ): ContactMessageViewItem[] => {
    let orderedMessages = messages.map((item) => {
      return {
        ...item,
        sendStatus: item.sendStatus || SendStatus.SENT,
        itemType: item.itemType,
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
          id: `separator_${uuidv4()}`,
          itemType: ConversationItemType.DATE_GROUP_SEPARATE_LINE,
          formattedTime: moment(currentDate).format('MMM, DD, YYYY'),
        } as ContactMessageViewItem);
      }

      // Add the current item to the result list
      result.push(item);

      // Update previousDate to the current item’s date
      previousDate = currentDate;
    });

    return result;
  };

  scrollToBottom(): void {
    if (!this.scrollContainer) return;

    setTimeout(() => {
      const container = this.scrollContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }, 200);
  }

  isScrollAtBottom = (): boolean => {
    const container = this.scrollContainer.nativeElement;
    let isAtBottom =
      container.scrollHeight - container.scrollTop - 100 <
      container.clientHeight;
    return isAtBottom;
  };

  // isScrollAtBottom = computed(() => {
  //   const container = this.scrollContainer.nativeElement;
  //   let isAtBottom =
  //     container.scrollHeight - container.scrollTop === container.clientHeight;
  //   return isAtBottom;
  // });

  //#region Upload image

  handlePreview = async (file: NzUploadFile): Promise<void> => {
    if (!file.url && !file['preview']) {
      file['preview'] = await Utils.getBase64(file.originFileObj!);
    }
    this.previewImage = file.url || file['preview'];
    this.previewVisible = true;
  };

  triggerUploadDialog() {
    // Programmatically open the file upload dialog
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  customRequestUploadImage = (item: NzUploadXHRArgs): any => {
    this._FileService
      .upload(
        item.file as any,
        item.file.filename as string,
        ConversationItemType.IMAGE
      )
      .then(
        (fileUrl) => {
          if (fileUrl) {
            item.onError!(null, item.file);
          }

          item.onSuccess!(fileUrl, item.file, null);
        },
        (error) => {
          item.onError!(null, item.file);
        }
      );
  };

  //#endregion

  //#region Audio recording
  startRecording() {
    if (!this.isRecording) {
      this.isRecording = true;
      this._AudioRecordingService.startRecording();
    }
  }

  abortRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this._AudioRecordingService.abortRecording();
    }

    this.clearRecordedData();
  }

  stopRecording = async () => {
    if (this.isRecording) {
      await this._AudioRecordingService.stopRecording();
      this.isRecording = false;
    }
  };

  clearRecordedData() {
    this.blobUrl = '';
    this.isRecording = false;
    this.recordedTime = '';
    this.recordingPercentage = 0;
    this.blobUrl = undefined;
    this.teste = null;
  }

  download(): void {
    const url = window.URL.createObjectURL(this.teste.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.teste.title;
    link.click();
  }

  //#endregion
}
