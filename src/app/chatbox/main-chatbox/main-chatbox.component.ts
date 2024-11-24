import { Utils } from './../../utilities/utils';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { ResourceService } from '../../services/resource.service';
import { NotificationService } from '../../services/notification.service';
import {
  ContactMessage,
  ContactMessageGroup,
  ConversationType,
} from '../../models/contact-message.model';
import { LocalStorageService } from '../../services/local-storage.service';
import {
  NEW_GROUP_CONVERSATION_ID,
  NEW_GROUP_CONVERSATION_NAME,
} from '../../utilities/chatbox.const';
import { ActivatedRoute, Router } from '@angular/router';
import { PhoneNumberListComponent } from '../phone-number-list/phone-number-list.component';
import { GroupContactCacheService } from '../../services/group-contact-cache.service';
import { from, mergeMap } from 'rxjs';
import { ContactListComponent } from '../contact-list/contact-list.component';
import _ from 'lodash';
import { UserService } from '../../services/user.service';

const CHECK_NEW_COMMING_MESSAGE_INTERVAL = 20000;
const LIMIT_SEND_MESSAGE_FAIL = 3;

@Component({
  selector: 'app-main-chatbox',
  templateUrl: './main-chatbox.component.html',
  styleUrl: './main-chatbox.component.scss',
})
export class MainChatboxComponent implements OnInit, OnDestroy {
  userId: string = '';
  isLoadingPhoneNumbers: boolean = false;
  isLoading: boolean = false;
  selectedPhoneNumberItem?: PhoneNumber;
  selectedContact?: ContactMessageGroup;
  contactMessageGroups: ContactMessageGroup[] = [];
  newCommingMessageInterval: any;

  constructor(
    private _ActivatedRoute: ActivatedRoute,
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService,
    private _LocalStorageService: LocalStorageService,
    private _GroupContactCacheService: GroupContactCacheService,
    private _UserService: UserService,
    private _Router: Router
  ) {}
  ngOnDestroy(): void {
    this.stopCheckNewMessageInterval();
  }

  @ViewChild(PhoneNumberListComponent)
  phoneNumberListComponent!: PhoneNumberListComponent;
  @ViewChild(ContactListComponent)
  contactListComponent!: ContactListComponent;

  phoneNumbers: PhoneNumber[] = [];
  isFirstRoundInterval = true;

  ngOnInit(): void {
    this._ActivatedRoute.paramMap.subscribe((params) => {
      this.userId = this._UserService.getUserId();
      console.log('User ID:', this.userId);
    });

    let isUserExpired = this._UserService.isUserExpired();
    if (isUserExpired) {
      this._Router.navigate(['/auth/user-expired']);
    }

    this.loadData();
  }

  loadData = async () => {
    this.isLoadingPhoneNumbers = true;
    try {
      await this.loadPhoneNumbers();
      await this.initAllGroupContactCache(this.phoneNumbers);
      this.startCheckNewCommingMessageInterval(this.phoneNumbers);
    } catch (error: any) {}

    this.isLoadingPhoneNumbers = false;
  };

  loadPhoneNumbers = async (): Promise<PhoneNumber[]> => {
    try {
      const items = await this._ResourceService.getPhoneNumbers(this.userId);
      this.phoneNumbers = items;

      // set the first item as selected
      if (items.length > 0 && items.some((p) => !p.expired && !p.isError)) {
        let availablePhoneNumbers = items.filter(
          (p) => !p.expired && !p.isError
        );
        this.selectPhoneNumber(availablePhoneNumbers[0]);
      }

      return items;
    } catch (error: any) {
      this._NotificationService.error(error);
    }

    return [];
  };

  initAllGroupContactCache = async (phoneNumbers: PhoneNumber[]) => {
    from(phoneNumbers)
      .pipe(
        mergeMap((phoneNumber) => this.fetchMessagesSilence(phoneNumber), 3) // Limit to 5 concurrent requests
      )
      .subscribe({
        next: (contactMessageGroups) => {
          contactMessageGroups.forEach((group) => {
            this._GroupContactCacheService.setLastSeen(
              group.id,
              new Date(),
              // new Date('2021-10-20'),
              group
            );
          });
        },
        error: (err) => console.error('Request failed:', err),
      });
  };

  selectPhoneNumber = async (phoneNumber: PhoneNumber) => {
    if (!phoneNumber.isError && !phoneNumber.expired) {
      console.log('Phone number is selected', phoneNumber.phoneNumber);
      this.selectedPhoneNumberItem = phoneNumber;
      await this.reloadContactList(phoneNumber);
      this.selectContactItem(this.contactMessageGroups[0]);
      this.checkNewMessageComming(phoneNumber);
    }
  };

  reloadContactList = async (phoneNumber: PhoneNumber) => {
    this.contactMessageGroups = await this.getPhoneDetails(phoneNumber);
    if (!this.checkIfGroupConversationExist(phoneNumber)) {
      this.newGroupConversation(phoneNumber);
    }

    this.contactMessageGroups.unshift(
      this._LocalStorageService.getItem(
        `GroupConversation_${phoneNumber.phoneNumber}`
      )
    );
  };

  selectContactItem = (contact: ContactMessageGroup) => {
    this.selectedContact = contact;
  };

  getPhoneDetails = async (
    phoneNumber: PhoneNumber
  ): Promise<ContactMessageGroup[]> => {
    this.isLoading = true;
    try {
      const contactMessageGroups = await this._ResourceService.getComunications(
        phoneNumber
      );

      this.isLoading = false;
      return contactMessageGroups;
    } catch (error: any) {
      // console.error(error);
      this._NotificationService.error(error.error);
      this.isLoading = false;
    }

    return [];
  };

  newGroupConversation = (phoneNumber: PhoneNumber) => {
    // check if already have group conversation
    if (
      this.checkIfGroupConversationExist(phoneNumber) ||
      this.selectedPhoneNumberItem == null
    ) {
      return;
    }

    // create new group conversation
    const newConversation = {
      id: NEW_GROUP_CONVERSATION_ID,
      name: NEW_GROUP_CONVERSATION_NAME,
      conversationType: ConversationType.GROUP,
      currentPhoneNumber: phoneNumber,
      direction: 'out',
      isOutgoing: true,
      timeCreated: new Date().toISOString(),
      type: 'message',
      from: Utils.convertPhoneNumber({
        TN: phoneNumber.phoneNumber,
        name: phoneNumber.phoneNumber,
        own: true,
      }),
      to: [],
      messages: [],
      newMessageCount: 0,
    } as ContactMessageGroup;
    this._LocalStorageService.setItem(
      `GroupConversation_${phoneNumber.phoneNumber}`,
      newConversation
    );
  };

  checkIfGroupConversationExist = (phoneNumber: PhoneNumber) => {
    return (
      this._LocalStorageService.getItem(
        `GroupConversation_${phoneNumber.phoneNumber}`
      ) != null
    );
  };

  sendMessageConversationSuccess = () => {
    if (this.selectedPhoneNumberItem != null) {
      this.reloadContactList(this.selectedPhoneNumberItem);
    }
  };

  startCheckNewCommingMessageInterval = (phoneNumberList: PhoneNumber[]) => {
    this.newCommingMessageInterval = setInterval(async () => {
      phoneNumberList.forEach(async (phoneNumber) => {
        this.checkNewMessageComming(phoneNumber);
      });
    }, CHECK_NEW_COMMING_MESSAGE_INTERVAL);
  };

  checkNewMessageComming = async (phoneNumber: PhoneNumber) => {
    let contactMessageGroups = await this.fetchMessagesSilence(phoneNumber);

    // update new message comming in phone number list
    if (this.phoneNumberListComponent) {
      let newMessageCount = contactMessageGroups.reduce(
        (countNewMessage, group) => {
          return (
            countNewMessage +
            group.messages.filter((message) => message.myStatus === 'UNREAD')
              .length
          );
        },
        0
      );
      this.phoneNumberListComponent.updateNewMessageComming(
        phoneNumber.id,
        newMessageCount
      );
    }

    // update new message comming in contact list
    if (this.contactListComponent) {
      let updateDic: {
        [key: string]: {
          newMessageCount: number;
          newMessages: ContactMessage[];
        };
      } = {};
      contactMessageGroups.forEach((group) => {
        let newMessages = group.messages.filter(
          (message) => message.myStatus === 'UNREAD'
        );
        updateDic[group.id] = {
          newMessageCount: newMessages.length,
          newMessages,
        };
        // updateDic[group.id] = group.messages.filter(
        //   (message) => message.myStatus === 'UNREAD'
        // ).length;
      });
      this.contactListComponent.updateNewMessageComming(updateDic);
    }
  };

  fetchMessagesSilence = async (
    phoneNumber: PhoneNumber
  ): Promise<ContactMessageGroup[]> => {
    try {
      const contactMessageGroups = await this._ResourceService.getComunications(
        phoneNumber
      );

      return contactMessageGroups;
    } catch (error: any) {
      // handle 'Reauthorize and try again' error
      if (
        _.isString(error.error) &&
        error.error.trim('\n') == 'Reauthorize and try again'
      ) {
        // this.markPhoneAsError(phoneNumber, 'Reauthorize and try again');
      }
    }

    return [];
  };

  stopCheckNewMessageInterval = () => {
    clearInterval(this.newCommingMessageInterval);
  };

  markPhoneAsError = (phoneNumber: PhoneNumber, errorDescription: string) => {
    let found = this.phoneNumbers.find((p) => p.id === phoneNumber.id);
    if (found) {
      found.isError = true;
      // call api to set phone number as unAuthorized
      this._ResourceService.markPhoneNumberAsError(found, errorDescription);
    }
  };

  triggerPhoneAsError = (data: {
    phoneNumberId: string;
    errorDescription: string;
  }) => {
    let found = this.phoneNumbers.find((p) => p.id === data.phoneNumberId);
    if (found) {
      found.isError = true;
      // call api to set phone number as unAuthorized
      this._ResourceService.markPhoneNumberAsError(
        found,
        data.errorDescription
      );
    }
  };

  replacePhoneNumberSuccess = (data: {
    oldPhoneId: string;
    newPhoneNumber: PhoneNumber;
  }) => {
    const found = this.phoneNumbers.find((p) => p.id === data.oldPhoneId);
    if (found) {
      found.phoneNumber = data.newPhoneNumber.phoneNumber;
      found.name = data.newPhoneNumber.name;
      found.id = data.newPhoneNumber.id;
      found.expired = false;
      found.isError = false;
      found.failCount = 0;
      found.newMessageCount = 0;
      //TODO need handle more action like reload list contact of new phone number
      this.selectPhoneNumber(found);
    }
  };

  markPhoneAsDownHandler = (phoneNumberId: string) => {
    let found = this.phoneNumbers.find((p) => p.id === phoneNumberId);
    if (found) {
      found.failCount++;
      if (found.failCount > LIMIT_SEND_MESSAGE_FAIL) {
        found.isError = true;
        // call api to set phone number as unAuthorized
        this._ResourceService.markPhoneNumberAsError(
          found,
          'Exceed limit send message fail'
        );
      }
    }
  };
}
