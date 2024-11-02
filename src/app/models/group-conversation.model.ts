import { ContactMessage } from './contact-message.model';
import { PhoneNumber } from './phone-number.model';

export type GroupConversation = {
  fromPhoneNumber: PhoneNumber;
  toPhoneNumbers: string[];
  messages: ContactMessage[];
};
