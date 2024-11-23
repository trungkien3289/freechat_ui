import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { EnvService } from './env.service';
import {
  PhoneComunication,
  PhoneComunicationType,
  PhoneShortSummary,
} from '../models/phone-comunication.model';
import { firstValueFrom } from 'rxjs';
import { ContactMessage, SendStatus } from '../models/contact-message.model';
import { Utils } from '../utilities/utils';
import _ from 'lodash';
import { GroupContactCacheService } from './group-contact-cache.service';
import { ChatBoxUtils } from '../utilities/chatbox-utils';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = ``;
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
    fromPhoneNumber: string,
    to: PhoneShortSummary[],
    text: string
  ): Promise<any> => {
    try {
      //TODO: for testing

      // if (Math.random() > 0.5) {
      //   Utils.delay(2000);
      //   throw 'Send message error bt network';
      // }
      const res = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/message`,
          {
            text,
            to,
          }
        )
      );

      return res;
    } catch (ex: any) {
      if (!_.isEmpty(ex.error)) {
        throw ex.error;
      } else {
        throw `Send message from ${fromPhoneNumber} error`;
      }
    }
  };

  sendImage = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    to: PhoneShortSummary[],
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
    to: PhoneShortSummary[],
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
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string
  ): Promise<ContactMessage[]> => {
    try {
      const defaultLastUpdateDate = Utils.convertDateToUtcTime(
        new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
      );

      let requestBody = {
        requests: [
          {
            queryParams: [
              { createdSince: '2024-10-10 04:23:36.512952' },
              { updatedSince: defaultLastUpdateDate },
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
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/request`,
          requestBody
        )
      )) as any;

      const communicationsRes = JSON.parse(res.result[0].body);
      let communications = communicationsRes.result
        .newCommunications as PhoneComunication[];

      communications = communications.filter(
        (item) => item.type === PhoneComunicationType.MESSAGE
      );

      // update message read status base on last seen of group
      const lastSeen: Date =
        this._GroupContactCacheService.getGroupLastSeen(groupId);

      let messages = communications
        .filter((item) => {
          return [...item.to, item.from]
            .filter((n) => !n.own)
            .some((to) => to.TN === toPhoneNumber);
        })
        .map((message) => {
          let updateTimeCreatedMessage = Utils.convertDateStringToLocalTime(
            message.timeCreated
          );
          return {
            direction: message.direction,
            text: message.text,
            id: message.id,
            // myStatus:
            //   lastSeen && new Date(message.timeCreated) > lastSeen
            //     ? 'UNREAD'
            //     : 'READ',
            myStatus:
              lastSeen && new Date(updateTimeCreatedMessage) > lastSeen
                ? 'UNREAD'
                : 'READ',
            timeCreated: updateTimeCreatedMessage,
            isOutgoing: message.direction == 'out',
            sendStatus: SendStatus.SENT,
            media: message.media,
            itemType: ChatBoxUtils.getMessageItemType(message),
          } as ContactMessage;
        });

      return messages;
    } catch (ex) {
      throw `Fetch Messages from ${fromPhoneNumber} to ${toPhoneNumber} error`;
    }
  };

  fetchNewMessages = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string,
    fromTime: string
  ): Promise<ContactMessage[]> => {
    try {
      let lastMessageTime = new Date(fromTime);
      let updatedSinceDate = new Date(lastMessageTime.getTime() + 1000);
      let sinceUpdateDateString = Utils.convertDateToUtcTime(updatedSinceDate);

      let requestBody = {
        requests: [
          {
            queryParams: [
              { createdSince: '2024-10-10 04:23:36.512952' },
              { updatedSince: sinceUpdateDateString },
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
          `${this.apiUrl}/api/chat/phone/${fromPhoneNumberId}/request`,
          requestBody
        )
      )) as any;

      const communicationsRes = JSON.parse(res.result[0].body);
      let communications = communicationsRes.result
        .newCommunications as PhoneComunication[];

      communications = communications.filter(
        (item) => item.type === PhoneComunicationType.MESSAGE
      );

      // update message read status base on last seen of group
      const lastSeen: Date =
        this._GroupContactCacheService.getGroupLastSeen(groupId);

      let messages = communications
        .filter((item) => {
          return [...item.to, item.from]
            .filter((n) => !n.own)
            .some((to) => to.TN === toPhoneNumber);
        })
        .map((message) => {
          let updateTimeCreatedMessage = Utils.convertDateStringToLocalTime(
            message.timeCreated
          );
          return {
            direction: message.direction,
            text: message.text,
            id: message.id,
            myStatus:
              lastSeen && new Date(updateTimeCreatedMessage) > lastSeen
                ? 'UNREAD'
                : 'READ',
            timeCreated: updateTimeCreatedMessage,
            isOutgoing: message.direction == 'out',
            sendStatus: SendStatus.SENT,
            media: message.media,
            itemType: ChatBoxUtils.getMessageItemType(message),
          } as ContactMessage;
        });

      return messages;
    } catch (ex) {
      throw `Fetch Messages from ${fromPhoneNumber} to ${toPhoneNumber} error`;
    }
  };
}
