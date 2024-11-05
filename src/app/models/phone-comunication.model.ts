export type PhoneComunication = {
  type: PhoneComunicationType;
  direction: string;
  from: PhoneShortSummary;
  to: PhoneShortSummary[];
  text: string;
  id: string;
  myStatus: string;
  timeCreated: string;
};

export enum PhoneComunicationType {
  CALL = 'call',
  MESSAGE = 'message',
}

export type PhoneShortSummary = {
  TN: string;
  name: string;
  own?: boolean;
};
