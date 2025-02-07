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
import {
  MAXIMIZE_CONTACT_NUMBER,
  MAXIMIZE_CONTACT_NUMBER_ONE_TIME,
  NEW_GROUP_CONVERSATION_ID,
} from '../../utilities/chatbox.const';
import { Utils } from '../../utilities/utils';
import { debounce, get, isString } from 'lodash';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FileService } from '../../services/file.service';
import { AudioRecordingService } from '../../services/audio-recording.service';
import {
  MessageDirection,
  PhoneComunicationType,
} from '../../models/phone-comunication.model';
import { ChatBoxUtils } from '../../utilities/chatbox-utils';
import { SelectedPhoneService } from '../../services/selected-phone.service';
import { ERROR_CODE_ENUM } from '../../utilities/phone-error.enum';

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

  inputPhoneNumber: string = '';
  isValidPhoneNumber: boolean = true;

  listOfTagOptions: string[] = [];

  @ViewChild('uploadComponent', { static: false }) uploadComponent!: any;
  fileInput: HTMLInputElement | null = null;

  @Input() set contact(contactGroup: ContactMessageGroup | undefined) {
    if (!!contactGroup) {
      if (
        this.contactGroup == null ||
        this.contactGroup.id != contactGroup.id
      ) {
        this.resetChatBox();
      }
      this.contactGroup = contactGroup;
      this.isNewGroupConversation = contactGroup.id.includes(
        NEW_GROUP_CONVERSATION_ID
      );
      this.messageViewItems = contactGroup.messages.map((item) => {
        return {
          ...item,
          sendStatus: item.sendStatus || SendStatus.SENT,
          formattedTime: this.formatTime(item.date),
        } as ContactMessageViewItem;
      });

      if (contactGroup.to && contactGroup.to.trim() !== '') {
        this.listOfTagOptions = contactGroup.to.split(',');
      }
    }
  }
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @Output() sendMessageGroupSuccess = new EventEmitter<void>();
  @Output() markPhoneAsDown = new EventEmitter<string>();
  @Output() triggerPhoneAsError = new EventEmitter<{
    phoneNumberId: string;
    errorDescription: string;
    errorCode: ERROR_CODE_ENUM;
  }>();

  constructor(
    private _ChatService: ChatService,
    private _NotificationService: NotificationService,
    private _FormBuilder: FormBuilder,
    private _LocalStorageService: LocalStorageService,
    private _FileService: FileService,
    private _AudioRecordingService: AudioRecordingService,
    private sanitizer: DomSanitizer,
    private _SelectedPhoneService: SelectedPhoneService
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

  addPhoneNumer = () => {
    let listPhones = this.inputPhoneNumber.split(',') || [];

    listPhones = listPhones.map((phoneNumber) => {
      return Utils.formatPhoneNumberTN(
        phoneNumber.replace(/\D/g, '').replace(/^\+/, '')
      );
    });

    const isError = listPhones.some((inputPhoneNumber) => {
      return (
        !Utils.isValidString(inputPhoneNumber) || inputPhoneNumber.length != 11
      );
    });

    if (isError) {
      this._NotificationService.warning(`Input phone number is invalid`);
      return;
    }

    let hasPhoneExisted = listPhones.some((inputPhoneNumber) => {
      return this.listOfTagOptions.includes(inputPhoneNumber);
    });

    if (hasPhoneExisted) {
      this._NotificationService.warning(`Has phone number is already added`);
      return;
    }

    if (
      this.listOfTagOptions.length + listPhones.length >
      MAXIMIZE_CONTACT_NUMBER_ONE_TIME
    ) {
      this._NotificationService.warning(
        `You can only send up to ${MAXIMIZE_CONTACT_NUMBER_ONE_TIME} contacts one time`
      );
      return;
    }

    let totalContacts =
      this.listOfTagOptions.length +
      this._SelectedPhoneService.getNumberContact() +
      listPhones.length;

    if (totalContacts > MAXIMIZE_CONTACT_NUMBER) {
      this._NotificationService.warning(
        `You can only send up to ${MAXIMIZE_CONTACT_NUMBER} contacts`
      );

      return;
    }

    this.listOfTagOptions = [...this.listOfTagOptions, ...listPhones];
    this.inputPhoneNumber = '';

    this.updateContactGroup();
  };

  removePhoneNumber = (phoneNumber: string) => {
    if (phoneNumber) {
      // remove from list of tag options
      this.listOfTagOptions = this.listOfTagOptions.filter(
        (item) => item !== phoneNumber
      );
      this.updateContactGroup();
    }
  };

  updateContactGroup = () => {
    this.contactGroup.to = this.listOfTagOptions
      .map((phoneNumber) => {
        const numericString = phoneNumber.replace(/\D/g, '');
        return Utils.formatPhoneNumberTN(numericString);
      })
      .join(',');
  };

  formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  resetChatBox = () => {
    clearInterval(this.fetchMessageInterval);
    this.messageViewItems = [];
    this.reTryError = 10;
    this.myForm.reset();
    this.isValidPhoneNumber = true;
    this.inputPhoneNumber = '';
    this.fileList = [];
    this.listOfTagOptions = [];
    this.abortRecording();
  };

  clearMessagesBox = () => {
    this.inputPhoneNumber = '';
    this.fileList = [];
    this.abortRecording();
    this.messageViewItems = [];
    this.contactGroup.messages = [];
    this._LocalStorageService.setItem(
      `GroupConversation_${this.contactGroup.currentPhoneNumber.phoneNumber}`,
      this.contactGroup
    );
  };

  sendMessageBtnClick = () => {
    if (this.listOfTagOptions.length > 0) {
      this.debouncedSubmit();
    } else {
      this._NotificationService.warning('Please add phone number');
    }
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

    if (
      !this._ChatService.canSendMessage(
        this.contactGroup.currentPhoneNumber.phoneNumber
      )
    ) {
      this._NotificationService.warning(
        `Cannot send messages in next ${this._ChatService.getWaitToSendMins(
          this.contactGroup.currentPhoneNumber.phoneNumber
        )} min(s)`
      );
      return;
    }

    this.isLoading = true;
    // If have images upload
    if (this.fileList.length > 0) {
      let uploadFilesRequests = this.fileList.map((file) => {
        return this.sendImageMessage(
          file.thumbUrl || '',
          file.originFileObj as File
        );
      });

      this.fileList = [];

      await Promise.allSettled(uploadFilesRequests);
    }

    if (this.myForm.valid) {
      if (ChatBoxUtils.isContainLink(this.myForm.value.textInput)) {
        this._NotificationService.warning(
          `Unable to send messages containing links. Please remove the link or change to format www.abc.com`
        );
        return;
      } else {
        const isSuccess = await this.sendTextMessage(
          this.myForm.value.textInput
        );
        if (isSuccess) {
          if (
            this.listOfTagOptions.length == MAXIMIZE_CONTACT_NUMBER_ONE_TIME
          ) {
            this._ChatService.updateLastSendMessageTime(
              this.contactGroup.currentPhoneNumber.phoneNumber
            );
          }

          this.sendMessageGroupSuccess.emit();
          this.clearMessagesBox();
        }
      }
    }

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
  sendImageMessage = async (imageUrl: string, file: File) => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      imageUrl,
      ConversationItemType.IMAGE,
      PhoneComunicationType.IMAGE
    );

    try {
      await Promise.allSettled(
        this.listOfTagOptions.map((toPhoneNumber) => {
          let numericString = toPhoneNumber.replace(/\D/g, '');
          numericString = Utils.formatPhoneNumberTN(numericString);
          this._ChatService.sendImage(
            this.contactGroup.currentPhoneNumber.id,
            this.contactGroup.currentPhoneNumber.clientId,
            this.contactGroup.currentPhoneNumber.username,
            this.contactGroup.currentPhoneNumber.userAgent,
            this.contactGroup.currentPhoneNumber.phoneNumber,
            numericString,
            file
          );
        })
      );

      this.updateMessageStatus(newMessage.id, SendStatus.SENT);
    } catch (error: any) {
      this._NotificationService.error(error.message);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error.message) && error.message.includes('Unauthorized')) {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Unauthorized',
          errorCode: ERROR_CODE_ENUM.BAD_CRIDENTIAL,
        });
      }
    }

    this.resetUploadImage();
  };

  sendTextMessage = async (message: string) => {
    let newMessage: ContactMessage = this.addMessageToGroup(
      message,
      ConversationItemType.MESSAGE,
      PhoneComunicationType.MESSAGE
    );

    this.myForm.reset();

    try {
      // await this._ChatService.sendMessage(
      //   this.contactGroup.currentPhoneNumber.id,
      //   this.contactGroup.currentPhoneNumber.clientId,
      //   this.contactGroup.currentPhoneNumber.username,
      //   this.contactGroup.currentPhoneNumber.userAgent,
      //   this.contactGroup.currentPhoneNumber.phoneNumber,
      //   this.contactGroup.to,
      //   newMessage.message
      // );

      const response = await Promise.allSettled(
        this.listOfTagOptions.map((toPhoneNumber) => {
          let numericString = toPhoneNumber.replace(/\D/g, '');
          numericString = Utils.formatPhoneNumberTN(numericString);
          return this._ChatService.sendMessage(
            this.contactGroup.currentPhoneNumber.id,
            this.contactGroup.currentPhoneNumber.clientId,
            this.contactGroup.currentPhoneNumber.username,
            this.contactGroup.currentPhoneNumber.userAgent,
            this.contactGroup.currentPhoneNumber.phoneNumber,
            numericString,
            newMessage.message
          );
        })
      );

      if (response.some((item) => item.status === 'rejected')) {
        this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
        const errorResponse = response
          .filter((item) => item.status === 'rejected')
          .map((item) => {
            return get(item, 'reason.message', '');
          })
          .join(',');

        if (isString(errorResponse) && errorResponse.includes('Unauthorized')) {
          this.triggerPhoneAsError.emit({
            phoneNumberId: this.contactGroup.currentPhoneNumber.id,
            errorDescription: 'Unauthorized',
            errorCode: ERROR_CODE_ENUM.BAD_CRIDENTIAL,
          });

          this._NotificationService.error(errorResponse);
        } else if (
          isString(errorResponse) &&
          errorResponse.includes('Forbidden')
        ) {
          this.triggerPhoneAsError.emit({
            phoneNumberId: this.contactGroup.currentPhoneNumber.id,
            errorDescription: 'Forbidden',
            errorCode: ERROR_CODE_ENUM.LIMIT_OTHER,
          });

          this._NotificationService.error(
            'Invalid phone number detected. Replacing this number will not be counted as a phone number replacement'
          );
        } else {
          this._NotificationService.error(errorResponse);
        }
        return false;
      } else {
        this.updateMessageStatus(newMessage.id, SendStatus.SENT);
        return true;
      }
    } catch (error: any) {
      this._NotificationService.error(error.message);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error.message) && error.message.includes('Unauthorized')) {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Unauthorized',
          errorCode: ERROR_CODE_ENUM.BAD_CRIDENTIAL,
        });
      }

      return false;
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
      PhoneComunicationType.AUDIO
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
        this.contactGroup.currentPhoneNumber.phoneNumber,
        this.contactGroup.to,
        fileUrl
      );

      this.updateMessageStatus(newMessage.id, SendStatus.SENT);
    } catch (error: any) {
      this._NotificationService.error(error.message);
      this.updateMessageStatus(newMessage.id, SendStatus.FAILED);
      if (isString(error.message) && error.message.includes('Unauthorized')) {
        this.triggerPhoneAsError.emit({
          phoneNumberId: this.contactGroup.currentPhoneNumber.id,
          errorDescription: 'Unauthorized',
          errorCode: ERROR_CODE_ENUM.BAD_CRIDENTIAL,
        });
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
  };

  addMessageToGroup = (
    message: string,
    itemType: ConversationItemType,
    messageType: PhoneComunicationType
  ): ContactMessage => {
    let newMessage = {
      id: uuidv4(),
      myStatus: 'READ',
      date: new Date().toString(),
      message_direction: MessageDirection.OUT,
      message: message,
      isOutgoing: true,
      sendStatus: SendStatus.SENDING,
      message_type: messageType,
      contact_value: this.contactGroup.to,
      e164_contact_value: `1${this.contactGroup.to}`,
      read: true,
      deleted: false,
      contact_name: this.contactGroup.to,
      itemType: itemType,
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
      formattedTime: this.formatTime(newMessage.date),
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
      this.contactGroup.to = '';
      this.contactGroup.messages = [];
      this.messageViewItems = [];
      this.inputPhoneNumber = '';
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
    Utils.getBase64(item.file as any).then((url) => {
      item.onSuccess!(url, item.file, null);
    });
    // this._FileService
    //   .upload(
    //     item.file as any,
    //     item.file.filename as string,
    //     ConversationItemType.IMAGE
    //   )
    //   .then(
    //     (fileUrl) => {
    //       if (fileUrl) {
    //         item.onError!(null, item.file);
    //       }

    //       item.onSuccess!(fileUrl, item.file, null);
    //     },
    //     (error) => {
    //       item.onError!(null, item.file);
    //     }
    //   );
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
