export type PhoneComunication = {
  type: string;
  direction: string;
  from: PhoneShortSummary;
  to: PhoneShortSummary[];
  text: string;
  id: string;
  myStatus: string;
  timeCreated: string;
};

export type PhoneShortSummary = {
  TN: string;
  name: string;
  own?: boolean;
};
