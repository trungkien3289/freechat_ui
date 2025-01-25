import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';

@Pipe({
  name: 'dateStringFormat',
})
export class DateStringFormatPipe implements PipeTransform {
  transform(
    value: Date | string | number | undefined,
    formatString: string = 'MMM, dd, yyyy'
  ): string {
    if (!value) return '';
    return format(new Date(value), formatString);
  }
}
