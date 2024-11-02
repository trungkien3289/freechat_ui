import { format } from 'date-fns';
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
}
