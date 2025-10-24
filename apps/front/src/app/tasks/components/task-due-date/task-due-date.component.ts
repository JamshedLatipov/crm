import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HumanDatePipe } from '../../../shared/pipes/human-date.pipe';
import { 
  differenceInMinutes, 
  differenceInDays, 
  differenceInHours,
  differenceInMilliseconds,
  isAfter,
  parseISO
} from 'date-fns';

interface TaskForDueDate {
  status?: string;
  dueDate?: string;
  updatedAt?: string;
  taskType?: {
    timeFrameSettings?: {
      slaResponseTime?: number;
      warningBeforeDeadline?: number;
      reminderBeforeDeadline?: number;
    };
  };
}

@Component({
  selector: 'app-task-due-date',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    HumanDatePipe
  ],
  template: `
    <div class="due-date-wrapper" 
         [ngClass]="getDueDateClass()"
         [matTooltip]="getDueDateTooltip()"
         matTooltipPosition="above">
      @let icon = getDueDateIcon();
      @if (icon === '❌') {
        <span class="due-icon emoji-icon">❌</span>
      } @else {
        <mat-icon class="due-icon">{{ icon }}</mat-icon>
      }
      <div class="due-content">
        <div class="due-date-value">{{ task.dueDate | humanDate:showTime }}</div>
        <div class="due-relative">{{ getRelativeDueDate() }}</div>
      </div>
    </div>
  `,
  styleUrls: ['./task-due-date.component.scss']
})
export class TaskDueDateComponent {
  @Input({ required: true }) task!: TaskForDueDate;
  @Input() showTime = false; // true для детальной страницы, false для таблицы

  // Определяет класс для дедлайна в зависимости от срока и настроек типа задачи
  getDueDateClass(): string {
    if (!this.task.dueDate) return 'due-date-normal';
    
    const now = new Date();
    const due = parseISO(this.task.dueDate);
    const diffMinutes = differenceInMinutes(due, now);
    const diffDays = differenceInDays(due, now);
    
    // Проверяем, была ли задача просрочена при закрытии
    if (this.task.status === 'done') {
      // Используем updatedAt если есть, иначе текущее время
      const closedAt = this.task.updatedAt ? parseISO(this.task.updatedAt) : now;
      
      // Задача закрыта с опозданием, если время закрытия больше дедлайна
      if (isAfter(closedAt, due)) {
        return 'due-date-done-late'; // Закрыта с опозданием
      }
      
      return 'due-date-done'; // Закрыта вовремя
    }
    
    // Если есть тип задачи с настройками
    if (this.task.taskType?.timeFrameSettings) {
      const settings = this.task.taskType.timeFrameSettings;
      
      // Проверяем SLA (приоритет выше остальных), только если еще не просрочено
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return 'due-date-sla-warning';
      }
      
      // Проверяем предупреждение перед дедлайном, только если еще не просрочено
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        return 'due-date-warning-zone';
      }
      
      // Проверяем напоминание, только если еще не просрочено
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        return 'due-date-reminder';
      }
    }
    
    // Стандартная логика
    if (diffMinutes < 0) return 'due-date-overdue';
    if (diffDays <= 1) return 'due-date-urgent';
    if (diffDays <= 3) return 'due-date-soon';
    return 'due-date-normal';
  }

  // Определяет иконку для дедлайна с учетом настроек типа
  getDueDateIcon(): string {
    if (!this.task.dueDate) return 'event';
    
    const now = new Date();
    const due = parseISO(this.task.dueDate);
    const diffMinutes = differenceInMinutes(due, now);
    const diffDays = differenceInDays(due, now);
    
    // Проверяем, была ли задача просрочена при закрытии
    if (this.task.status === 'done') {
      const closedAt = this.task.updatedAt ? parseISO(this.task.updatedAt) : now;
      
      // Задача закрыта с опозданием
      if (isAfter(closedAt, due)) {
        return 'schedule'; // Иконка часов для закрытых с опозданием
      }
      
      return 'check_circle'; // Галочка для закрытых вовремя
    }
    
    // Если есть настройки типа задачи
    if (this.task.taskType?.timeFrameSettings) {
      const settings = this.task.taskType.timeFrameSettings;
      
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return 'flash_on'; // SLA критично
      }
      
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        return 'warning_amber'; // Предупреждение
      }
      
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        return 'notifications_active'; // Напоминание
      }
    }
    
    if (diffMinutes < 0) return '❌'; // Эмодзи для просроченных задач
    if (diffDays <= 1) return 'warning';
    return 'event';
  }

  // Возвращает человекочитаемое относительное время с учетом настроек типа
  getRelativeDueDate(): string {
    if (!this.task.dueDate) return '—';
    
    const now = new Date();
    const due = parseISO(this.task.dueDate);
    const diffMinutes = differenceInMinutes(due, now);
    const diffDays = differenceInDays(due, now);
    
    // Для закрытых задач показываем статус
    if (this.task.status === 'done') {
      const closedAt = this.task.updatedAt ? parseISO(this.task.updatedAt) : now;
      
      // Проверяем, была ли задача закрыта с опозданием
      if (isAfter(closedAt, due)) {
        return 'С опозданием';
      }
      
      return 'Завершено';
    }
    
    // Если есть настройки типа задачи - показываем более детальную информацию
    if (this.task.taskType?.timeFrameSettings) {
      const settings = this.task.taskType.timeFrameSettings;
      
      // SLA критично
      if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime && diffMinutes > 0) {
        const minutesLeft = diffMinutes;
        if (minutesLeft < 60) {
          return `SLA: ${minutesLeft} мин`;
        }
        const hours = Math.floor(minutesLeft / 60);
        const mins = minutesLeft % 60;
        return `SLA: ${hours}ч ${mins}мин`;
      }
      
      // Предупреждение
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `${diffMinutes} мин до дедлайна`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `${hours} ${this.getHoursText(hours)} ${mins} мин до дедлайна`;
        }
        return `${hours} ${this.getHoursText(hours)} до дедлайна`;
      }
      
      // Напоминание
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `${diffMinutes} мин`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `${hours}ч ${mins}мин`;
        }
        return `${hours}ч`;
      }
    }
    
    // Стандартная логика - проверяем по минутам для точности
    if (diffMinutes < 0) {
      const overdueMins = Math.abs(diffMinutes);
      if (overdueMins < 60) {
        return `Просрочено на ${overdueMins} мин`;
      }
      if (overdueMins < 1440) { // Меньше суток
        const hours = Math.floor(overdueMins / 60);
        const mins = overdueMins % 60;
        if (mins > 0) {
          return `Просрочено на ${hours}ч ${mins}мин`;
        }
        return `Просрочено на ${hours}ч`;
      }
      const overdueDays = Math.floor(overdueMins / 1440);
      if (overdueDays === 1) return 'Просрочено на 1 день';
      if (overdueDays < 5) return `Просрочено на ${overdueDays} дня`;
      return `Просрочено на ${overdueDays} дней`;
    }
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === 2) return 'Послезавтра';
    if (diffDays <= 7) return `Через ${diffDays} дней`;
    if (diffDays <= 14) return 'Через неделю';
    if (diffDays <= 30) return `Через ${Math.floor(diffDays / 7)} недели`;
    
    const months = Math.floor(diffDays / 30);
    if (months === 1) return 'Через месяц';
    return `Через ${months} месяца`;
  }

  // Возвращает текст подсказки для иконки дедлайна
  getDueDateTooltip(): string {
    if (!this.task.dueDate) return 'Дедлайн не указан';
    
    const now = new Date();
    const due = parseISO(this.task.dueDate);
    const diffMinutes = differenceInMinutes(due, now);
    
    if (this.task.status === 'done') {
      // Используем updatedAt если есть, иначе текущее время
      const closedAt = this.task.updatedAt ? parseISO(this.task.updatedAt) : now;
      
      // Проверяем, была ли задача просрочена при закрытии
      if (isAfter(closedAt, due)) {
        const delayHours = differenceInHours(closedAt, due);
        const delayDays = differenceInDays(closedAt, due);
        const delayMinutes = differenceInMinutes(closedAt, due);
        
        if (delayHours < 24) {
          const hours = delayHours;
          const minutes = delayMinutes % 60;
          if (hours > 0) {
            return `⚠️ Задача закрыта с опозданием на ${hours} ${this.getHoursText(hours)} ${minutes} мин`;
          }
          return `⚠️ Задача закрыта с опозданием на ${minutes} мин`;
        }
        return `⚠️ Задача закрыта с опозданием на ${delayDays} ${delayDays === 1 ? 'день' : 'дней'}`;
      }
      
      return '✅ Задача завершена вовремя';
    }

    // Если есть настройки типа задачи
    if (this.task.taskType?.timeFrameSettings) {
      const settings = this.task.taskType.timeFrameSettings;

      // SLA критично - только если еще не просрочено
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return `⚡ Критично! Осталось ${diffMinutes} мин до нарушения SLA (${settings.slaResponseTime} мин)`;
      }

      // Предупреждение - только если еще не просрочено
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        if (diffMinutes < 60) {
          const warningHours = Math.floor(settings.warningBeforeDeadline / 60);
          return `⚠️ Предупреждение! До дедлайна осталось ${diffMinutes} мин - зона предупреждения (${warningHours}ч)`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const warningHours = Math.floor(settings.warningBeforeDeadline / 60);
        if (mins > 0) {
          return `⚠️ Предупреждение! До дедлайна осталось ${hours}ч ${mins}мин - зона предупреждения (${warningHours}ч)`;
        }
        return `⚠️ Предупреждение! До дедлайна осталось ${hours}ч - зона предупреждения (${warningHours}ч)`;
      }

      // Напоминание - только если еще не просрочено
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        if (diffMinutes < 60) {
          const reminderHours = Math.floor(settings.reminderBeforeDeadline / 60);
          return `🔔 Напоминание: до дедлайна осталось ${diffMinutes} мин - зона напоминания (${reminderHours}ч)`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const reminderHours = Math.floor(settings.reminderBeforeDeadline / 60);
        if (mins > 0) {
          return `🔔 Напоминание: до дедлайна осталось ${hours}ч ${mins}мин - зона напоминания (${reminderHours}ч)`;
        }
        return `🔔 Напоминание: до дедлайна осталось ${hours}ч - зона напоминания (${reminderHours}ч)`;
      }
    }

    // Стандартные подсказки
    if (diffMinutes < 0) {
      const totalMinutes = Math.abs(diffMinutes);
      
      if (totalMinutes < 60) {
        return `❌ Просрочено на ${totalMinutes} мин`;
      }
      
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      if (hours < 24) {
        if (mins > 0) {
          return `❌ Просрочено на ${hours} ${this.getHoursText(hours)} ${mins} мин`;
        }
        return `❌ Просрочено на ${hours} ${this.getHoursText(hours)}`;
      }
      
      const days = Math.floor(totalMinutes / (60 * 24));
      return `❌ Просрочено на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
    }

    const diffDays = differenceInDays(due, now);
    if (diffDays === 0) {
      return '🔥 Дедлайн сегодня!';
    }
    if (diffDays === 1) {
      return '⚠️ Дедлайн завтра';
    }
    if (diffDays <= 3) {
      return `⚠️ Скоро дедлайн - через ${diffDays} дня`;
    }
    
    return `📅 До дедлайна осталось ${diffDays} ${diffDays === 1 ? 'день' : 'дней'}`;
  }

  // Склонение часов
  private getHoursText(hours: number): string {
    if (hours === 1) return 'час';
    if (hours >= 2 && hours <= 4) return 'часа';
    return 'часов';
  }
}
