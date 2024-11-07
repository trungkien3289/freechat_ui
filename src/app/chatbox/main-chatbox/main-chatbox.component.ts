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
import { ActivatedRoute } from '@angular/router';
import { PhoneNumberListComponent } from '../phone-number-list/phone-number-list.component';
import { GroupContactCacheService } from '../../services/group-contact-cache.service';
import { from, mergeMap } from 'rxjs';
import { ContactListComponent } from '../contact-list/contact-list.component';

const CHECK_NEW_COMMING_MESSAGE_INTERVAL = 20000;

@Component({
  selector: 'app-main-chatbox',
  templateUrl: './main-chatbox.component.html',
  styleUrl: './main-chatbox.component.scss',
})
export class MainChatboxComponent implements OnInit, OnDestroy {
  userId: string = '';
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
    private _GroupContactCacheService: GroupContactCacheService
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
      this.userId = params.get('id') || '';
      console.log('User ID:', this.userId);
    });

    this.loadData();
  }

  loadData = async () => {
    await this.loadPhoneNumbers();
    await this.initAllGroupContactCache(this.phoneNumbers);
    this.startCheckNewCommingMessageInterval(this.phoneNumbers);
  };

  loadPhoneNumbers = async (): Promise<PhoneNumber[]> => {
    this.isLoading = true;
    try {
      const items = await this._ResourceService.getPhoneNumbers(this.userId);
      this.phoneNumbers = items;

      // set the first item as selected
      if (items.length > 0) {
        this.selectPhoneNumber(items[0]);
      }

      return items;
    } catch (error: any) {
      // console.error(error);
      this._NotificationService.error(error);
    }

    this.isLoading = false;
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
    console.log('Phone number is selected', phoneNumber.phoneNumber);
    this.selectedPhoneNumberItem = phoneNumber;
    await this.reloadContactList(phoneNumber);
    this.selectContactItem(this.contactMessageGroups[0]);
    this.checkNewMessageComming(phoneNumber);
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
      // console.error(error);
      // handle 'Reauthorize and try again' error
      if (error.error.trim('\n') == 'Reauthorize and try again') {
        this.setPhoneNumberAsUnAuthorized(phoneNumber);
      }
    }

    return [];
  };

  stopCheckNewMessageInterval = () => {
    clearInterval(this.newCommingMessageInterval);
  };

  setPhoneNumberAsUnAuthorized = (phoneNumber: PhoneNumber) => {
    phoneNumber.unAuthorized = true;
    // call api to set phone number as unAuthorized
    this._ResourceService.expirePhoneNumber(phoneNumber);
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
      found.unAuthorized = false;
      found.newMessageCount = 0;
      //TODO need handle more action like reload list contact of new phone number
      this.selectPhoneNumber(found);
    }
  };
}
