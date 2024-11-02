import { format } from 'date-fns';
import { PhoneShortSummary } from '../models/phone-comunication.model';
export class Utils {
  static formatPhoneNumber = (value: string | undefined): string => {
    if (!value) return '';
    // Remove any non-digit characters
    const cleanedValue = value.replace(/\D+/g, '');

    // Format the phone number as (123) 456-7890
    const formattedValue = cleanedValue.replace(
      /(\d{3})(\d{3})(\d{4})/,
      '($1) $2-$3'
    );

    return formattedValue;
  };

  static formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  static isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  static formatPhoneNumberTN = (phoneNumber: string) => {
    const tn = phoneNumber.replace(/\D/g, '');

    return '1' + tn;
  };

  static formatPhoneNumberName = (phoneNumber: string) => {
    if (phoneNumber.length > 1) {
      return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${
        phoneNumber.substring(3, 6) + '-' + phoneNumber.substring(6, 10)
      }`;
    }
    return phoneNumber;
  };

  static convertPhoneNumber = (phoneNumber: PhoneShortSummary) => {
    let phoneWithoutCountryCode = phoneNumber.TN.substring(1);
    return {
      ...phoneNumber,
      name: Utils.formatPhoneNumberName(phoneWithoutCountryCode),
      TN: Utils.formatPhoneNumberTN(phoneWithoutCountryCode),
    };
  };
}
