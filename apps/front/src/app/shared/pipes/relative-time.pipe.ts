import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | undefined): string {
    if (!value) return '';
    
    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      const absDiff = Math.abs(diff);
      
      const totalMinutes = Math.floor(absDiff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      
      if (diff < 0) {
        // Просрочено
        if (totalMinutes < 60) {
          return `${totalMinutes} мин назад`;
        } else if (hours < 24) {
          if (minutes > 0) {
            return `${hours} ${this.getHoursText(hours)} ${minutes} мин назад`;
          }
          return `${hours} ${this.getHoursText(hours)} назад`;
        } else {
          return `${days} дн. назад`;
        }
      } else {
        // До дедлайна
        if (totalMinutes < 60) {
          return `через ${totalMinutes} мин`;
        } else if (hours < 24) {
          if (minutes > 0) {
            return `через ${hours} ${this.getHoursText(hours)} ${minutes} мин`;
          }
          return `через ${hours} ${this.getHoursText(hours)}`;
        } else {
          return `через ${days} дн.`;
        }
      }
    } catch (error) {
      return '';
    }
  }

  private getHoursText(hours: number): string {
    if (hours === 1) return 'час';
    if (hours >= 2 && hours <= 4) return 'часа';
    return 'часов';
  }
}
