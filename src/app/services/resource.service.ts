import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';
import { EnvService } from './env.service';
import { PhoneNumber } from '../models/phone-number.model';
import {
  MessageDirection,
  PhoneComunication,
  PhoneComunicationType,
} from '../models/phone-comunication.model';
import {
  ContactMessage,
  ContactMessageGroup,
  SendStatus,
} from '../models/contact-message.model';
import { Utils } from '../utilities/utils';
import _, { isEmpty } from 'lodash';
import { GroupContactCacheService } from './group-contact-cache.service';
import { ChatBoxUtils } from '../utilities/chatbox-utils';

const TOTAL_PHONE_NUMBER = 10;

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private apiUrl = ``; // Change to your Node.js API

  constructor(
    private http: HttpClient,
    public jwtHelper: JwtHelperService,
    private _EnvService: EnvService,
    private _GroupContactCacheService: GroupContactCacheService
  ) {
    this.apiUrl = _EnvService.apiUrl;
  }

  getPhoneNumbers = async (userId: string): Promise<PhoneNumber[]> => {
    try {
      let pingerPhones: {
        phoneNumber: string;
        _id: string;
        name: string;
        isExpired: boolean;
        isError: boolean;
        assignDateTimestamp: number;
        canReplacePhone: boolean;
        clientId: string;
        username: string;
        userAgent: string;
      }[] = (await firstValueFrom(
        this.http.get(`${this.apiUrl}/api/chat/user/phones`)
      )) as any;

      let phoneNumbers = pingerPhones.map((item) => {
        return {
          id: item._id,
          phoneNumber: item.phoneNumber,
          name: Utils.formatPhoneNumberName(
            Utils.removeCountryCode(item.phoneNumber)
          ),
          newMessageCount: 0,
          expired: item.isExpired,
          isError: item.isError,
          failCount: 0,
          assignDateTimestamp: item.assignDateTimestamp,
          canReplacePhone: item.canReplacePhone,
          clientId: item.clientId,
          username: item.username,
          userAgent: item.userAgent,
          isEmpty: false,
        };
      });

      let remainPhoneNumber = TOTAL_PHONE_NUMBER - phoneNumbers.length;
      if (remainPhoneNumber > 0) {
        for (let i = 0; i < remainPhoneNumber; i++) {
          phoneNumbers.push({
            id: Utils.newGuid(),
            phoneNumber: '',
            name: '',
            newMessageCount: 0,
            expired: false,
            isError: false,
            failCount: 0,
            assignDateTimestamp: 0,
            canReplacePhone: false,
            clientId: '',
            username: '',
            userAgent: '',
            isEmpty: true,
          });
        }
      }

      return phoneNumbers;
    } catch (ex) {
      throw 'Get PhoneNumber of user error';
    }
  };

  getComunications = async (
    phoneNumber: PhoneNumber
  ): Promise<ContactMessageGroup[]> => {
    let communications: PhoneComunication[] = (await firstValueFrom(
      this.http.post(
        `${this.apiUrl}/api/chat/phone/${phoneNumber.id}/fetch-messages`,
        {
          clientId: phoneNumber.clientId,
          username: phoneNumber.username,
          userAgent: phoneNumber.userAgent,
        }
      )
    )) as any;

    communications = communications.filter(
      (item) => item.message_type == PhoneComunicationType.MESSAGE
    );

    return this.groupCommunications(communications, phoneNumber);
  };

  groupCommunications = (
    communications: PhoneComunication[],
    currentPhone: PhoneNumber
  ): ContactMessageGroup[] => {
    const grouped: any = {};
    communications.forEach((message) => {
      let groupKey = `${currentPhone.phoneNumber}|${message.contact_value}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: Utils.formatPhoneNumberName(
            Utils.removeCountryCode(message.contact_name)
          ),
          currentPhoneNumber: currentPhone,
          from: currentPhone.phoneNumber,
          to: message.contact_value,
          id: groupKey,
          messages: [],
        };
      }

      grouped[groupKey].messages.push({
        ...message,
        date: message.date,
        sendStatus: SendStatus.SENT,
        isOutgoing: message.message_direction == MessageDirection.OUT,
        itemType: ChatBoxUtils.getMessageItemType(message),
        timeCreated: Utils.convertDateStringToLocalTime(message.date),
      });
    });

    // Convert grouped object to an array
    return Object.keys(grouped).map((key) => {
      let group: ContactMessageGroup = grouped[key];
      // update message read status base on last seen of group
      const lastSeen: Date = this._GroupContactCacheService.getGroupLastSeen(
        group.id
      );

      group.messages = group.messages
        .map((mess: ContactMessage) => {
          return {
            ...mess,
            myStatus:
              lastSeen && new Date(mess.date) > lastSeen ? 'UNREAD' : 'READ',
          } as ContactMessage;
        })
        .sort((a: ContactMessage, b: ContactMessage) => {
          if (a?.date == null || b?.date == null) return 0;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      return group as ContactMessageGroup;
    });
    // .sort((a, b) => {
    //   if (a?.messages.length == 0 || b?.messages.length == 0) return 0;
    //   return (
    //     new Date(
    //       (_.last(b.messages) as ContactMessage).timeCreated.split('.')[0]
    //     ).getTime() -
    //     new Date(
    //       (_.last(a.messages) as ContactMessage).timeCreated.split('.')[0]
    //     ).getTime()
    //   );
    // });
  };

  replacePhoneNumber = async (
    phoneNumber: PhoneNumber
  ): Promise<PhoneNumber> => {
    try {
      let res: any = (await firstValueFrom(
        this.http.post(`${this.apiUrl}/api/chat/phone/replace`, {
          phoneId: phoneNumber.id,
        })
      )) as any;

      return {
        id: res.newPhoneNumber._id,
        phoneNumber: res.newPhoneNumber.phoneNumber,
        name: Utils.formatPhoneNumberName(
          Utils.removeCountryCode(res.newPhoneNumber.phoneNumber)
        ),
        clientId: res.newPhoneNumber.clientId,
        username: res.newPhoneNumber.username,
        userAgent: res.newPhoneNumber.userAgent,
        newMessageCount: 0,
        expired: res.newPhoneNumber.isExpired,
        isError: res.newPhoneNumber.isError,
        failCount: 0,
        assignDateTimestamp: res.newPhoneNumber.assignDateTimestamp,
        canReplacePhone: true,
        isEmpty: false,
      };
    } catch (ex: any) {
      if (ex.error && ex.error.message) {
        throw ex.error.message;
      } else {
        throw 'Replace phone number error';
      }
    }
  };

  pickPhoneNumber = async (phoneNumber: PhoneNumber): Promise<PhoneNumber> => {
    try {
      let res: any = (await firstValueFrom(
        this.http.post(`${this.apiUrl}/api/chat/phone/pick-phone`, {})
      )) as any;

      return {
        id: res.newPhoneNumber._id,
        phoneNumber: res.newPhoneNumber.phoneNumber,
        name: Utils.formatPhoneNumberName(
          Utils.removeCountryCode(res.newPhoneNumber.phoneNumber)
        ),
        clientId: res.newPhoneNumber.clientId,
        username: res.newPhoneNumber.username,
        userAgent: res.newPhoneNumber.userAgent,
        newMessageCount: 0,
        expired: res.newPhoneNumber.isExpired,
        isError: res.newPhoneNumber.isError,
        failCount: 0,
        assignDateTimestamp: res.newPhoneNumber.assignDateTimestamp,
        canReplacePhone: true,
        isEmpty: false,
      };
    } catch (ex: any) {
      if (ex.error && ex.error.message) {
        throw ex.error.message;
      } else {
        throw 'Pick phone number error';
      }
    }
  };

  markPhoneNumberAsError = async (
    phoneNumber: PhoneNumber,
    errorDescription: string
  ): Promise<PhoneNumber> => {
    try {
      let res: any = (await firstValueFrom(
        this.http.post(`${this.apiUrl}/api/chat/phone/mark-as-error`, {
          phoneId: phoneNumber.id,
          errorDescription: errorDescription,
        })
      )) as any;

      return res;
    } catch (ex) {
      throw 'Mark phone number as error failed.';
    }
  };

  /// Fetch new messages from server for phone number

  fetchNewMessageOfPhones = async (
    phones: PhoneNumber[]
  ): Promise<
    {
      phoneId: string;
      newMessageCount: number;
      contactGroupsInfoDic: {
        [key: string]: {
          newMessageCount: number;
          newMessages: ContactMessage[];
        };
      };
    }[]
  > => {
    const phoneItems = JSON.parse(JSON.stringify(phones)) as any[];
    const requestPhoneBodys: {
      phoneId: string;
      clientId: string;
      username: string;
      userAgent: string;
    }[] = phones.map((phone) => {
      return {
        phoneId: phone.id,
        clientId: phone.clientId,
        username: phone.username,
        userAgent: phone.userAgent,
      };
    });

    const results: {
      success: boolean;
      phoneId: string;
      pingerResult: any;
      message: string;
    }[] = await this.callAPI(requestPhoneBodys);

    let successResults = results.filter((item) => item.success);

    const inforItems: any[] = [];
    successResults.forEach((result: { phoneId: string; pingerResult: any }) => {
      let communications = result.pingerResult as PhoneComunication[];
      const phone = phoneItems.find((item) => {
        return item.id == result.phoneId;
      });
      if (!phone) throw 'Phone number not found';
      let infoItem = this.processSingleItem(phone, communications);
      inforItems.push(infoItem);
    });

    return inforItems;
  };

  countAvailablePhoneNumbers = async (): Promise<number> => {
    try {
      let res: number = (await firstValueFrom(
        this.http.get(`${this.apiUrl}/api/chat/phone/count-available`)
      )) as any;

      return res;
    } catch (ex) {
      throw 'Count available phone numbers failed.';
    }
  };

  countRemainReplaceTimes = async (): Promise<number> => {
    try {
      let res: number = (await firstValueFrom(
        this.http.get(`${this.apiUrl}/api/chat/phone/remain-replace-times`)
      )) as any;

      return res;
    } catch (ex) {
      throw 'Count remain replace times failed.';
    }
  };

  callAPI = async (requestBody: any): Promise<any> => {
    let res: any = (await firstValueFrom(
      this.http.post(
        `${this.apiUrl}/api/chat/phone/fetch-new-messages`,
        requestBody
      )
    )) as any;

    return res;
  };

  processSingleItem = (
    phone: PhoneNumber,
    newCommunications: PhoneComunication[]
  ): {
    phoneId: string;
    newMessageCount: number;
    contactGroupsInfoDic: {
      [key: string]: {
        newMessageCount: number;
        newMessages: ContactMessage[];
      };
    };
  } => {
    const communications = newCommunications.filter(
      (item) => item.message_type == PhoneComunicationType.MESSAGE
    );

    let contactMessageGroups: ContactMessageGroup[] = this.groupCommunications(
      communications,
      phone
    );

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

    let contactGroupsInfoDic: {
      [key: string]: {
        newMessageCount: number;
        newMessages: ContactMessage[];
      };
    } = {};

    contactMessageGroups.forEach((group) => {
      let newMessages = group.messages.filter(
        (message) => message.myStatus === 'UNREAD'
      );
      contactGroupsInfoDic[group.id] = {
        newMessageCount: newMessages.length,
        newMessages,
      };
    });

    return {
      phoneId: phone.id,
      newMessageCount: newMessageCount,
      contactGroupsInfoDic: contactGroupsInfoDic,
    };
  };
}
