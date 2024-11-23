export type PhoneNumber = {
  id: string;
  phoneNumber: string;
  name: string;
  newMessageCount: number;
  expired: boolean;
  isError: boolean;
  failCount: number;
  assignDateTimestamp: number;
};
