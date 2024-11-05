import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { EnvService } from './env.service';
import {
  PhoneComunication,
  PhoneComunicationType,
  PhoneShortSummary,
} from '../models/phone-comunication.model';
import { firstValueFrom, Observable } from 'rxjs';
import { PhoneNumber } from '../models/phone-number.model';
import {
  ContactMessage,
  ContactMessageGroup,
  SendStatus,
} from '../models/contact-message.model';
import { ca } from 'date-fns/locale';
import { Utils } from '../utilities/utils';
import _ from 'lodash';
import { GroupContactCacheService } from './group-contact-cache.service';

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
          `${this.apiUrl}/api/user/phone/${fromPhoneNumberId}/message`,
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

  fetchMessages = async (
    fromPhoneNumberId: string,
    fromPhoneNumber: string,
    toPhoneNumber: string,
    groupId: string
  ): Promise<ContactMessage[]> => {
    try {
      let requestBody = {
        requests: [
          {
            queryParams: [
              { createdSince: '2024-10-10 04:23:36.512952' },
              { updatedSince: '2024-10-24 04:23:36.467539' },
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
          `${this.apiUrl}/api/user/phone/${fromPhoneNumberId}/request`,
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
          } as ContactMessage;
        });

      return messages;
    } catch (ex) {
      throw `Fetch Messages from ${fromPhoneNumber} to ${toPhoneNumber} error`;
    }
  };
}
