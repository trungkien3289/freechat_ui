import { PhoneShortSummary } from './phone-comunication.model';
import { PhoneNumber } from './phone-number.model';

export type ContactMessageGroup = {
  name: string;
  currentPhoneNumber: PhoneNumber;
  type: string; // message type 'message'|'file'|'image'
  direction: 'in' | 'out';
  from: PhoneShortSummary;
  to: PhoneShortSummary[];
  messages: ContactMessage[];
  id: string;
  timeCreated: string;
  isOutgoing: boolean;
  conversationType: ConversationType;
};

export enum ConversationType {
  GROUP = 'Group',
  SINGLE = 'Single',
}

export type ContactMessage = {
  text: string;
  id: string;
  myStatus: string;
  timeCreated: string;
  direction: string;
  isOutgoing: boolean;
  sendStatus: SendStatus;
};

export enum SendStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

export type ContactMessageViewItem = ContactMessage & {
  statusIcon: string;
  formattedTime: string;
  itemType: ConversationItemType;
};

export enum ConversationItemType {
  MESSAGE = 'message',
  DATE_GROUP_SEPARATE_LINE = 'date_group_separate_line',
}

export type MessageGroupByDateItem = {
  date: string;
  messages: ContactMessageViewItem[];
};
