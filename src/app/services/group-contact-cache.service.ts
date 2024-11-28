import { Injectable } from '@angular/core';
import { ContactMessage } from '../models/contact-message.model';

@Injectable({
  providedIn: 'root',
})
export class GroupContactCacheService {
  groupDic: {
    [key: string]: {
      unSentMessages: ContactMessage[];
      lastSeen: Date;
      group: any;
    };
  } = {};

  constructor() {}

  cacheGroupUnsentMessage = (groupId: string, messages: ContactMessage[]) => {
    this.groupDic[groupId] = {
      unSentMessages: messages,
      lastSeen: new Date(),
      group: null,
    };
  };

  clearUnsentMessage = (groupId: string) => {
    if (this.groupDic[groupId]) {
      this.groupDic[groupId].unSentMessages = [];
    }
  };

  getGroupUnsentMessage = (groupId: string): ContactMessage[] => {
    return this.groupDic[groupId]?.unSentMessages || [];
  };

  getGroupLastSeen = (groupId: string): Date => {
    return this.groupDic[groupId]?.lastSeen || new Date();
  };

  getAllGroupCache = () => {
    return this.groupDic;
  };

  setLastSeen = (groupId: string, lastSeen: Date, group: any) => {
    if (this.groupDic[groupId] == null) {
      this.groupDic[groupId] = {
        unSentMessages: [],
        lastSeen: lastSeen,
        group: group,
      };
    } else {
      this.groupDic[groupId].lastSeen = lastSeen;
    }
  };
}
