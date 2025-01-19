// export type PhoneComunication = {
//   type: PhoneComunicationType;
//   direction: string;
//   from: PhoneShortSummary;
//   to: PhoneShortSummary[];
//   text: string;
//   id: string;
//   myStatus: string;
//   timeCreated: string;
//   media?: { image?: string; audio?: string };
// };

export type PhoneComunication = {
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
  media?: { image?: string; audio?: string };
};

export enum PhoneComunicationType {
  CALL = 0,
  MESSAGE = 1,
  AUDIO = 3,
  IMAGE = 2,
}

export enum MessageDirection {
  IN = 1,
  OUT = 2,
}

export type PhoneShortSummary = {
  TN: string;
  name: string;
  own?: boolean;
};
