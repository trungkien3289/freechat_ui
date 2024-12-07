import { format } from 'date-fns';
import { PhoneShortSummary } from '../models/phone-comunication.model';
import moment from 'moment';
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
      return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(
        3,
        6
      )}-${phoneNumber.substring(6, 10)}`;
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

  static removeCountryCode = (phoneNumber: string) => {
    if (phoneNumber.length > 10) {
      phoneNumber = phoneNumber.substring(1);
    }
    return phoneNumber;
  };

  static scrollToBottom(container: any): void {
    container.scrollTop = container.scrollHeight;
  }

  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convert date string utc to local time
  static convertDateStringToLocalTime = (dateString: string): string => {
    let localTimeOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(
      new Date(dateString).getTime() - localTimeOffset
    ).toString();
  };

  static getBase64 = (file: File): Promise<string | ArrayBuffer | null> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  static convertDateToUtcTime = (date: Date): string => {
    let utcDate = date.getTime() + date.getTimezoneOffset() * 60000;
    return Utils.formatDateWithServerTimeFormat(new Date(utcDate));
  };

  static convertDateStringToUtcTime = (dateString: string): string => {
    let date = new Date(dateString);
    let utcDate = date.getTime() + date.getTimezoneOffset() * 60000;
    return Utils.formatDateWithServerTimeFormat(new Date(utcDate));
  };

  static formatDateWithServerTimeFormat(date: Date) {
    const dateString = moment(date).format('YYYY-MM-DD HH:mm:ss.SSSSSS');
    return dateString;
  }

  static validatePhoneNumber = (phoneNumber: string) => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})$/;
    return phoneRegex.test(phoneNumber);
  };
}
