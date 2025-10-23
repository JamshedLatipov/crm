import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

@Pipe({
  name: 'humanDate',
  standalone: true
})
export class HumanDatePipe implements PipeTransform {
  transform(value: string | Date | undefined, includeTime = false): string {
    if (!value) return '';
    
    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      const formatStr = includeTime ? "d MMMM yyyy 'в' HH:mm" : "d MMMM yyyy";
      return format(date, formatStr, { locale: ru });
    } catch (error) {
      return typeof value === 'string' ? value : '';
    }
  }
}
