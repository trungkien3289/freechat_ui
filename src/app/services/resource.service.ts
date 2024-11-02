import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';
import { EnvService } from './env.service';
import { PhoneNumber } from '../models/phone-number.model';
import { PhoneComunication } from '../models/phone-comunication.model';
import {
  ContactMessageGroup,
  ConversationType,
} from '../models/contact-message.model';
import { first } from 'lodash';
import { Utils } from '../utilities/utils';

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private apiUrl = ``; // Change to your Node.js API

  constructor(
    private http: HttpClient,
    public jwtHelper: JwtHelperService,
    private _EnvService: EnvService
  ) {
    this.apiUrl = _EnvService.apiUrl;
  }

  getPhoneNumbers = async (userId: string): Promise<PhoneNumber[]> => {
    try {
      let res: {
        pingerPhones: { phoneNumber: string; _id: string; name: string }[];
      } = (await firstValueFrom(
        this.http.get(`${this.apiUrl}/api/user/${userId}`)
      )) as any;

      let phoneNumbers = res.pingerPhones.map((item) => {
        return {
          id: item._id,
          phoneNumber: item.phoneNumber,
          name: Utils.formatPhoneNumberName(item.name),
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
          `${this.apiUrl}/api/user/phone/${phoneNumber.id}/request`,
          requestBody
        )
      )) as any;

      const communicationsRes = JSON.parse(res.result[0].body);
      let communications = communicationsRes.result
        .newCommunications as PhoneComunication[];

      return this.groupCommunications(communications, phoneNumber);
    } catch (ex) {
      throw 'Get Phone Number info error';
    }
  };

  groupCommunications = (
    communications: PhoneComunication[],
    currentPhone: PhoneNumber
  ): ContactMessageGroup[] => {
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
            id: message.id,
            type: message.type,
            direction: message.direction,
            from: message.from,
            to: message.to,
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
          timeCreated: message.timeCreated,
          direction: 'out',
          isOutgoing: true,
        });
      }
    }
    for (const message of communications) {
      if (message.direction == 'in') {
        const from = currentPhone.phoneNumber;
        const t = [...message.to, message.from].filter(
          (recipient) => !recipient.own
        );
        const to = t
          .map((recipient) => recipient.TN)
          .sort()
          .join(',');
        const key = `${from}|${to}`; // Create a unique key combining 'from' and 'to'
        if (!grouped[key]) {
          currentTime = message.timeCreated;
          grouped[key] = {
            id: message.id,
            type: message.type,
            direction: message.direction,
            from: message.from,
            to: message.to,
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
          timeCreated: message.timeCreated,
          direction: 'in',
          isOutgoing: false,
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
          conversationType:
            group.to.length > 1
              ? ConversationType.GROUP
              : ConversationType.SINGLE,
        } as ContactMessageGroup;
      })
      .sort((a, b) => a.conversationType.localeCompare(b.conversationType));
  };
}
