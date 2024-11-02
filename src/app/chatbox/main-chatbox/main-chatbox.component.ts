import { Utils } from './../../utilities/utils';
import { Component, OnInit } from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { ResourceService } from '../../services/resource.service';
import { NotificationService } from '../../services/notification.service';
import {
  ContactMessageGroup,
  ConversationType,
} from '../../models/contact-message.model';
import { LocalStorageService } from '../../services/local-storage.service';
import {
  NEW_GROUP_CONVERSATION_ID,
  NEW_GROUP_CONVERSATION_NAME,
} from '../../utilities/chatbox.const';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-main-chatbox',
  templateUrl: './main-chatbox.component.html',
  styleUrl: './main-chatbox.component.scss',
})
export class MainChatboxComponent implements OnInit {
  userId: string = '';
  isLoading: boolean = false;
  selectedPhoneNumberItem?: PhoneNumber;
  selectedContact?: ContactMessageGroup;
  contactMessageGroups: ContactMessageGroup[] = [];

  constructor(
    private _ActivatedRoute: ActivatedRoute,
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService,
    private _LocalStorageService: LocalStorageService
  ) {
    // this.userId = this._ActivatedRoute.snapshot.paramMap.get('id');
    // console.log('Received ID:', this.id);
  }

  ngOnInit(): void {
    this._ActivatedRoute.paramMap.subscribe((params) => {
      this.userId = params.get('id') || '';
      console.log('User ID:', this.userId);
    });
  }

  selectPhoneNumber = async (phoneNumber: PhoneNumber) => {
    console.log('Phone number is selected', phoneNumber.phoneNumber);
    this.selectedPhoneNumberItem = phoneNumber;
    this.reloadContactList(phoneNumber);
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

      // set the first item as selected
      // if (this.contactMessageGroups.length > 0) {
      //   this.selectItem(this.contactMessageGroups[0]);
      // }
    } catch (error: any) {
      console.error(error);
      this._NotificationService.error(error);
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

  sendMessageGroupConversationSuccess = () => {
    if (this.selectedPhoneNumberItem != null) {
      this.reloadContactList(this.selectedPhoneNumberItem);
    }
  };
}
