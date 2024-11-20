import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
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
  ConversationItemType,
  SendStatus,
} from '../../models/contact-message.model';
import { LocalStorageService } from '../../services/local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { NEW_GROUP_CONVERSATION_ID } from '../../utilities/chatbox.const';
import { Utils } from '../../utilities/utils';
import { debounce, get, isString } from 'lodash';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FileService } from '../../services/file.service';
import { AudioRecordingService } from '../../services/audio-recording.service';

const INTERVAL_RELOAD_CHATBOX = 10000;
const MAX_RECORDING_SECONDS = 60;

@Component({
  selector: 'app-group-conversation-box',
  templateUrl: './group-conversation-box.component.html',
  styleUrl: './group-conversation-box.component.scss',
})
export class GroupConversationBoxComponent
  implements OnDestroy, AfterViewChecked, AfterViewInit
{
  messageViewItems: ContactMessageViewItem[] = [];
  contactGroup!: ContactMessageGroup;
  isLoading: boolean = false;
  fetchMessageInterval: any;
  reTryError: number = 10;
  myForm: FormGroup;
  isNewGroupConversation: boolean = false;

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
  @Output() sendMessageGroupSuccess = new EventEmitter<void>();
  @Output() markPhoneAsDown = new EventEmitter<string>();
  @Output() triggerPhoneAsError = new EventEmitter<{
    phoneNumberId: string;
    errorDescription: string;
  }>();

  listOfTagOptions: string[] = [];
  listOfOption: Array<{ label: string; value: string }> = [];

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder,
    private _LocalStorageService: LocalStorageService,
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

  ngAfterViewInit(): void {
    // Access the native file input element within the nz-upload component
    this.fileInput = this.uploadComponent?.uploadComp?.file?.nativeElement;
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.resetChatBox();
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
    this.fileList = [];
    this.abortRecording();
  };

  sendMessageBtnClick = () => {
    this.debouncedSubmit();
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

  debouncedSubmit = debounce(async () => {
    if (this.isRecording) return;

    this.isLoading = true;
    // If have images upload
    if (this.fileList.length > 0) {
      let uploadFilesRequests = this.fileList.map((file) => {
        return this.sendImageMessage(file.response);
      });

      this.fileList = [];

      await Promise.allSettled(uploadFilesRequests);
    }

    if (this.myForm.valid) {
      await this.sendTextMessage(this.myForm.value.textInput);
    }

    this.sendMessageGroupSuccess.emit();

    this.isLoading = false;
    this.scrollToBottom();
  }, 200);

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
  sendImageMessage = async (imageUrl: string) => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      '',
      ConversationItemType.IMAGE,
      { image: imageUrl }
    );

    try {
      await this._ChatService.sendImage(
        this.contactGroup.currentPhoneNumber.id,
        this.contactGroup.from.TN,
        this.contactGroup.to,
        imageUrl
      );

      this.updateMessageStatus(newMessage.id, SendStatus.SENT);
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error) && error == 'Missing sender assigned phone number') {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Missing sender assigned phone number',
        });
      } else {
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    }

    this.resetUploadImage();
  };

  sendTextMessage = async (message: string) => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      message,
      ConversationItemType.MESSAGE
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
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error) && error == 'Missing sender assigned phone number') {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Missing sender assigned phone number',
        });
      } else {
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    }
  };

  sendAudioMessage = async (
    audioUrl: SafeUrl,
    audioBlob: Blob,
    audioFileName: string
  ) => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      '',
      ConversationItemType.AUDIO,
      { audio: audioUrl as string }
    );

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

      this.updateMessageStatus(newMessage.id, SendStatus.SENT);
    } catch (error: any) {
      this._NotificationService.error(error);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error) && error == 'Missing sender assigned phone number') {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Missing sender assigned phone number',
        });
      } else {
        this.markPhoneAsDown.emit(this.contactGroup.currentPhoneNumber.id);
      }
    }
  };

  //#endregion

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.isEmojiPickerVisible = false;
      this.sendMessageBtnClick();
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

  addMessageToGroup = (
    message: string,
    itemType: ConversationItemType,
    media?: { image?: string; audio?: string }
  ): ContactMessage => {
    let newMessage = {
      id: uuidv4(),
      myStatus: 'READ',
      timeCreated: new Date().toISOString(),
      direction: 'out',
      isOutgoing: true,
      text: message,
      sendStatus: SendStatus.SENDING,
      itemType: itemType,
      media: media,
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

  scrollToBottom(): void {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }

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
