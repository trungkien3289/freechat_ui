import {
  MessageDirection,
  PhoneComunicationType,
  PhoneShortSummary,
} from './phone-comunication.model';
import { PhoneNumber } from './phone-number.model';

// export type ContactMessageGroup = {
//   name: string;
//   currentPhoneNumber: PhoneNumber;
//   type: string;
//   direction: 'in' | 'out';
//   from: PhoneShortSummary;
//   to: PhoneShortSummary[];
//   messages: ContactMessage[];
//   id: string;
//   timeCreated: string;
//   isOutgoing: boolean;
//   conversationType: ConversationType;
//   newMessageCount: number;
// };

export type ContactMessageGroup = {
  name: string;
  currentPhoneNumber: PhoneNumber;
  from: string;
  to: string;
  messages: ContactMessage[];
  id: string;
  timeCreated: string;
  newMessageCount: number;
  conversationType: ConversationType;
};

export enum ConversationType {
  GROUP = 'Group',
  SINGLE = 'Single',
}

export type ContactMessage = {
  // text: string;
  // id: string;
  // myStatus: ReadStatus;
  // timeCreated: string;
  // direction: string;
  // isOutgoing: boolean;
  // sendStatus: SendStatus;
  // itemType: ConversationItemType;
  // media?: { image?: string; audio?: string };

  id: string;
  message_type: PhoneComunicationType;
  message_direction: MessageDirection;
  contact_value: string; // phone number without country code
  e164_contact_value: string; // phone number with country code
  contact_name: string;
  message: string;
  read: boolean;
  date: string;
  deleted: boolean;
  myStatus: ReadStatus;
  sendStatus: SendStatus;
  media?: { image?: string; audio?: string };
  itemType: ConversationItemType;
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
