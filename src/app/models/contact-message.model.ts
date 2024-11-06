import { PhoneShortSummary } from './phone-comunication.model';
import { PhoneNumber } from './phone-number.model';

export type ContactMessageGroup = {
  name: string;
  currentPhoneNumber: PhoneNumber;
  type: string;
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
  myStatus: ReadStatus;
  timeCreated: string;
  direction: string;
  isOutgoing: boolean;
  sendStatus: SendStatus;
  itemType: ConversationItemType;
  media?: { image?: string; audio?: string };
};

export enum ReadStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
}

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
  IMAGE = 'image',
  AUDIO = 'audio',
}

export type MessageGroupByDateItem = {
  date: string;
  messages: ContactMessageViewItem[];
};
