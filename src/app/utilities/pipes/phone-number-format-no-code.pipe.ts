import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneNumberFormatNoCode',
})
export class PhoneNumberFormatNoCodePipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    // Remove any non-digit characters
    const cleanedValue = value.replace(/\D+/g, '');
    let phoneWithoutCountryCode = cleanedValue;
    if (phoneWithoutCountryCode.length > 10) {
      phoneWithoutCountryCode = value.substring(1);
    }

    // Format the phone number as (123) 456-7890
    const formattedValue = phoneWithoutCountryCode.replace(
      /(\d{3})(\d{3})(\d{4})/,
      '($1) $2-$3'
    );

    return formattedValue;
  }
}
