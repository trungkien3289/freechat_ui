import { Injectable } from '@angular/core';
import { ContactMessage } from '../models/contact-message.model';

@Injectable({
  providedIn: 'root',
})
export class GroupContactCacheService {
  groupDic: {
    [key: string]: {
      unSentMessages: ContactMessage[];
    };
  } = {};

  constructor() {}

  cacheGroupUnsentMessage = (groupId: string, messages: ContactMessage[]) => {
    this.groupDic[groupId] = {
      unSentMessages: messages,
    };
  };

  getGroupUnsentMessage = (groupId: string): ContactMessage[] => {
    return this.groupDic[groupId]?.unSentMessages || [];
  };
}
