import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { EnvService } from './env.service';
import {
  MessageDirection,
  PhoneComunication,
  PhoneComunicationType,
  PhoneShortSummary,
} from '../models/phone-comunication.model';
import { firstValueFrom, from } from 'rxjs';
import { ContactMessage, SendStatus } from '../models/contact-message.model';
import { Utils } from '../utilities/utils';
import _ from 'lodash';
import { GroupContactCacheService } from './group-contact-cache.service';
import { PhoneNumber } from '../models/phone-number.model';
import moment from 'moment';
import { ChatBoxUtils } from '../utilities/chatbox-utils';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = ``;
  // private lastSendMessageTime: number = new Date().getTime() - 60 * 1000;
  private lastSendMessageTime: { [key: string]: number } = {};

  constructor(
    private http: HttpClient,
    public jwtHelper: JwtHelperService,
    private _EnvService: EnvService,
    private _GroupContactCacheService: GroupContactCacheService
  ) {
    this.apiUrl = _EnvService.apiUrl;
  }

  sendMessage = async (
    fromPhoneNumberId: string,
    clientId: string,
    username: string,
    userAgent: string,
    fromPhoneNumber: string,
    to: string,
    text: string
  ): Promise<any> => {
    try {
      const res = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/message`,
          {
            clientId,
            username,
            userAgent,
            text: ChatBoxUtils.replaceSpecialCharactersInMessage(text),
            to,
          }
        )
      );

      this.updateLastSendMessageTime(fromPhoneNumber);

      return res;
    } catch (ex: any) {
      // if (!_.isEmpty(ex.error)) {
      //   throw ex.error;
      // } else {
      throw new Error(
        `Send message from ${fromPhoneNumber} failed: ${ex.message}`
      );
      // }
    }
  };

  sendImage = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    to: string,
    imageUrl: string
  ) => {
    try {
      const res = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/message`,
          {
            media: { image: imageUrl },
            to,
          }
        )
      );

      this.updateLastSendMessageTime(fromPhoneNumber);

      return res;
    } catch (ex: any) {
      if (!_.isEmpty(ex.error)) {
        throw ex.error;
      } else {
        throw `Send image from ${fromPhoneNumber} error`;
      }
    }
  };

  sendAudio = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    to: string,
    audioUrl: string
  ) => {
    try {
      const res = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/message`,
          {
            media: { audio: audioUrl },
            to,
          }
        )
      );

      this.updateLastSendMessageTime(fromPhoneNumber);

      return res;
    } catch (ex: any) {
      if (!_.isEmpty(ex.error)) {
        throw ex.error;
      } else {
        throw `Send image from ${fromPhoneNumber} error`;
      }
    }
  };

  fetchMessages = async (
    fromPhone: PhoneNumber,
    toPhoneNumber: string,
    groupId: string
  ): Promise<ContactMessage[]> => {
    try {
      // const defaultLastUpdateDate = Utils.convertDateToUtcTime(
      //   new Date(fromPhone.assignDateTimestamp)
      // );

      // const createdSince = Utils.convertDateToUtcTime(
      //   moment().startOf('month').toDate()
      // );

      // let requestBody = {
      //   requests: [
      //     {
      //       queryParams: [
      //         { createdSince: createdSince },
      //         { updatedSince: defaultLastUpdateDate },
      //       ],
      //       contentType: 'application/json',
      //       useHTTPS: '1',
      //       resource: '/2.0/communications/sync',
      //       method: 'GET',
      //     },
      //   ],
      // };

      let res: any = (await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhone.id}/fetch-messages`,
          {
            clientId: fromPhone.clientId,
            username: fromPhone.username,
            userAgent: fromPhone.userAgent,
          }
        )
      )) as any;

      let communications = res as PhoneComunication[];
      communications = communications.filter(
        (item) => item.message_type === PhoneComunicationType.MESSAGE
      );

      // update message read status base on last seen of group
      const lastSeen: Date =
        this._GroupContactCacheService.getGroupLastSeen(groupId);

      let messages = communications
        .filter((item) => {
          return item.contact_value == toPhoneNumber;
        })
        .map((message) => {
          let updateTimeCreatedMessage = Utils.convertDateStringToLocalTime(
            message.date
          );
          return {
            message_direction: message.message_direction,
            message: message.message,
            id: message.id,
            contact_name: message.contact_name,
            contact_value: message.contact_value,
            e164_contact_value: message.e164_contact_value,
            read: message.read,
            date: message.date,
            myStatus:
              lastSeen && new Date(updateTimeCreatedMessage) > lastSeen
                ? 'UNREAD'
                : 'READ',
            timeCreated: updateTimeCreatedMessage,
            isOutgoing: message.message_direction == MessageDirection.OUT,
            sendStatus: SendStatus.SENT,
            message_type: message.message_type,
            deleted: message.deleted,
            itemType: ChatBoxUtils.getMessageItemType(message),
          } as ContactMessage;
        });

      return messages;
    } catch (ex) {
      throw `Fetch Messages from ${fromPhone.phoneNumber} to ${toPhoneNumber} error`;
    }
  };

  fetchNewMessages = async (
    // fromPhoneNumberId: string,
    // fromPhoneNumber: string,
    fromPhone: PhoneNumber,
    toPhoneNumber: string,
    groupId: string,
    fromTime: string
  ): Promise<ContactMessage[]> => {
    try {
      let lastMessageTime = new Date(fromTime);
      let assignDate = new Date(fromPhone.assignDateTimestamp);
      let lastUpdateDate =
        assignDate > lastMessageTime ? assignDate : lastMessageTime;
      let updatedSinceDate = new Date(lastUpdateDate.getTime());

      let sinceUpdateDateString = Utils.convertDateToUtcTime(updatedSinceDate);
      const createdSince = Utils.convertDateToUtcTime(
        moment(lastUpdateDate).startOf('month').toDate()
      );

      // let requestBody = {
      //   requests: [
      //     {
      //       queryParams: [
      //         { createdSince: createdSince },
      //         { updatedSince: sinceUpdateDateString },
      //       ],
      //       contentType: 'application/json',
      //       useHTTPS: '1',
      //       resource: '/2.0/communications/sync',
      //       method: 'GET',
      //     },
      //   ],
      // };
      // let res: any = (await firstValueFrom(
      //   this.http.post(
      //     `${this.apiUrl}/api/chat/phone/${fromPhone.id}/request`,
      //     requestBody
      //   )
      // )) as any;

      let res: any = (await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhone.id}/fetch-messages`,
          {
            clientId: fromPhone.clientId,
            username: fromPhone.username,
            userAgent: fromPhone.userAgent,
          }
        )
      )) as any;

      const communicationsRes = JSON.parse(res.result[0].body);
      let communications = communicationsRes.result
        .newCommunications as PhoneComunication[];

      communications = communications.filter(
        (item) => item.message_type === PhoneComunicationType.MESSAGE
      );

      // update message read status base on last seen of group
      const lastSeen: Date =
        this._GroupContactCacheService.getGroupLastSeen(groupId);

      let messages = communications
        .filter((item) => {
          return item.contact_value == toPhoneNumber;
        })
        .map((message) => {
          let updateTimeCreatedMessage = Utils.convertDateStringToLocalTime(
            message.date
          );
          return {
            message_direction: message.message_direction,
            message: message.message,
            id: message.id,
            contact_name: message.contact_name,
            contact_value: message.contact_value,
            e164_contact_value: message.e164_contact_value,
            read: message.read,
            date: message.date,
            myStatus:
              lastSeen && new Date(updateTimeCreatedMessage) > lastSeen
                ? 'UNREAD'
                : 'READ',
            timeCreated: updateTimeCreatedMessage,
            isOutgoing: message.message_direction == MessageDirection.OUT,
            sendStatus: SendStatus.SENT,
            media: message.media,
            message_type: message.message_type,
            deleted: message.deleted,
            itemType: ChatBoxUtils.getMessageItemType(message),
          } as ContactMessage;
        });

      return messages;
    } catch (ex) {
      throw `Fetch Messages from ${fromPhone.phoneNumber} to ${toPhoneNumber} error`;
    }
  };

  updateLastSendMessageTime = (fromPhoneNumber: string) => {
    this.lastSendMessageTime[fromPhoneNumber] = new Date().getTime();
  };

  canSendMessage = (fromPhoneNumber: string) => {
    if (this.lastSendMessageTime[fromPhoneNumber] == null) {
      this.lastSendMessageTime[fromPhoneNumber] = new Date().getTime();
      return true;
    }
    const now = new Date().getTime();
    return now - this.lastSendMessageTime[fromPhoneNumber] > 60 * 1000;
  };

  getWaitToSendSeconds = (fromPhoneNumber: string) => {
    if (this.lastSendMessageTime[fromPhoneNumber] == null) {
      this.lastSendMessageTime[fromPhoneNumber] =
        new Date().getTime() - 60 * 1000 - 1;
    }
    const now = new Date().getTime();
    return (
      60 - Math.round((now - this.lastSendMessageTime[fromPhoneNumber]) / 1000)
    );
  };
}
