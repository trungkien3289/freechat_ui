import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneNumberFormatNoCode',
})
export class PhoneNumberFormatNoCodePipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';

    let phoneWithoutCountryCode = value.substring(1);

    // Remove any non-digit characters
    const cleanedValue = phoneWithoutCountryCode.replace(/\D+/g, '');

    // Format the phone number as (123) 456-7890
    const formattedValue = cleanedValue.replace(
      /(\d{3})(\d{3})(\d{4})/,
      '($1) $2-$3'
    );

    return formattedValue;
  }
}
