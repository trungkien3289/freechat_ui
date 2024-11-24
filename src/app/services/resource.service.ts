import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';
import { EnvService } from './env.service';
import { PhoneNumber } from '../models/phone-number.model';
import {
  PhoneComunication,
  PhoneComunicationType,
} from '../models/phone-comunication.model';
import {
  ContactMessage,
  ContactMessageGroup,
  ConversationItemType,
  ConversationType,
  SendStatus,
} from '../models/contact-message.model';
import { Utils } from '../utilities/utils';
import _ from 'lodash';
import { GroupContactCacheService } from './group-contact-cache.service';
import { ChatBoxUtils } from '../utilities/chatbox-utils';

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
        };
      });

      return phoneNumbers;
    } catch (ex) {
      throw 'Get PhoneNumber of user error';
    }
  };

  getComunications = async (
    phoneNumber: PhoneNumber
  ): Promise<ContactMessageGroup[]> => {
    const defaultLastUpdateDate = Utils.convertDateToUtcTime(
      // new Date(phoneNumber.assignDateTimestamp)
      new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    );

    let requestBody = {
      requests: [
        {
          queryParams: [
            { createdSince: '2024-10-10 04:23:36.512952' },
            // { updatedSince: '2024-11-24 04:23:36.467539' },
            { updatedSince: defaultLastUpdateDate }, //check
          ],
          contentType: 'application/json',
          useHTTPS: '1',
          resource: '/2.0/communications/sync',
          method: 'GET',
        },
      ],
    };
    let res: any = (await firstValueFrom(
      this.http.post(
        `${this.apiUrl}/api/chat/phone/${phoneNumber.id}/request`,
        requestBody
      )
    )) as any;

    const communicationsRes = JSON.parse(res.result[0].body);
    let communications = communicationsRes.result
      .newCommunications as PhoneComunication[];

    //TODO: Now just filter only messages
    communications = communications.filter(
      (item) => item.type == PhoneComunicationType.MESSAGE
    );

    return this.groupCommunications(communications, phoneNumber);
  };

  groupCommunications = (
    communications: PhoneComunication[],
    currentPhone: PhoneNumber
  ): ContactMessageGroup[] => {
    const groupCacheDict = this._GroupContactCacheService.getAllGroupCache();
    const grouped: any = {};
    let currentTime;

    for (const message of communications) {
      if (message.direction == 'out') {
        const from = currentPhone.phoneNumber;
        const t = [...message.to, message.from].filter(
          (recipient) => !recipient.own
        );
        const to = t
          .map((recipient) => recipient.TN)
          .sort()
          .join(','); // Create a unique key for 'to' numbers

        const key = `${from}|${to}`; // Create a unique key combining 'from' and 'to'
        if (!grouped[key]) {
          currentTime = message.timeCreated;
          grouped[key] = {
            id: key,
            type: message.type,
            direction: message.direction,
            from: message.from,
            to: message.to,
            messages: [],
            conversationType:
              message.to.length > 1
                ? ConversationType.GROUP
                : ConversationType.SINGLE,
            timeCreated:
              currentTime > message.timeCreated
                ? currentTime
                : message.timeCreated,
          };
        }

        grouped[key].messages.push({
          text: message.text,
          id: message.id,
          myStatus: message.myStatus,
          timeCreated: Utils.convertDateStringToLocalTime(message.timeCreated),
          direction: 'out',
          isOutgoing: true,
          sendStatus: SendStatus.SENT,
          media: message.media,
          itemType: ChatBoxUtils.getMessageItemType(message),
        });
      }
    }
    for (const message of communications) {
      // only get message from single number to current phone number
      if (message.direction == 'in' && message.to.length == 1) {
        const from = currentPhone.phoneNumber;
        const t = [...message.to, message.from].filter(
          (recipient) => !recipient.own
        );
        const to = t
          .map((recipient) => recipient.TN)
          .sort()
          .join(',');

        let fromObject = [...message.to].filter(
          (recipient) => recipient.own == true
        );

        let toObject = message.from;

        const key = `${from}|${to}`; // Create a unique key combining 'from' and 'to'
        if (!grouped[key]) {
          currentTime = message.timeCreated;
          grouped[key] = {
            id: key,
            type: message.type,
            direction: message.direction,
            from: _.first(fromObject),
            to: [toObject],
            conversationType: ConversationType.SINGLE,
            messages: [],
            timeCreated:
              currentTime > message.timeCreated
                ? currentTime
                : message.timeCreated,
          };
        }
        grouped[key].messages.push({
          text: message.text,
          id: message.id,
          myStatus: message.myStatus,
          timeCreated: Utils.convertDateStringToLocalTime(message.timeCreated),
          direction: 'in',
          isOutgoing: false,
          sendStatus: SendStatus.SENT,
          itemType: ChatBoxUtils.getMessageItemType(message),
          media: message.media,
        });
      }
    }

    // Convert grouped object to an array
    return Object.keys(grouped)
      .map((key) => {
        let group = grouped[key];
        const t = [...group.to, group.from].filter(
          (recipient) => !recipient.own
        );

        // update message read status base on last seen of group
        const lastSeen: Date = this._GroupContactCacheService.getGroupLastSeen(
          group.id
        );

        group.messages = group.messages
          .map((mess: ContactMessage) => {
            return {
              ...mess,
              myStatus:
                lastSeen && new Date(mess.timeCreated) > lastSeen
                  ? 'UNREAD'
                  : 'READ',
            } as ContactMessage;
          })
          .sort((a: ContactMessage, b: ContactMessage) => {
            if (a?.timeCreated == null || b?.timeCreated == null) return 0;
            return (
              new Date(a.timeCreated).getTime() -
              new Date(b.timeCreated).getTime()
            );
          });

        return {
          id: group.id,
          name: t
            .map((recipient) => Utils.convertPhoneNumber(recipient).name)
            .join(', '),
          currentPhoneNumber: currentPhone,
          type: group.type,
          direction: group.direction,
          from: Utils.convertPhoneNumber(group.from),
          to: group.to.map((t: any) => Utils.convertPhoneNumber(t)),
          messages: group.messages,
          timeCreated: group.timeCreated,
          isOutgoing: group.direction == 'out',
          conversationType: group.conversationType,
        } as ContactMessageGroup;
      })
      .sort((a, b) => {
        if (a?.messages.length == 0 || b?.messages.length == 0) return 0;
        return (
          new Date(
            (_.last(b.messages) as ContactMessage).timeCreated.split('.')[0]
          ).getTime() -
          new Date(
            (_.last(a.messages) as ContactMessage).timeCreated.split('.')[0]
          ).getTime()
        );
      });
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
        newMessageCount: 0,
        expired: res.newPhoneNumber.isExpired,
        isError: res.newPhoneNumber.isError,
        failCount: 0,
        assignDateTimestamp: res.newPhoneNumber.assignDateTimestamp,
      };
    } catch (ex: any) {
      if (ex.error && ex.error.message) {
        throw ex.error.message;
      } else {
        throw 'Replace phone number error';
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
}
