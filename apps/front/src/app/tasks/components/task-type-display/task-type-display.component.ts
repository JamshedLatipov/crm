import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface TaskType {
  id: number;
  name: string;
  color?: string;
  icon?: string;
}

@Component({
  selector: 'app-task-type-display',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './task-type-display.component.html',
  styleUrls: ['./task-type-display.component.scss']
})
export class TaskTypeDisplayComponent {
  @Input({ required: true }) taskType?: TaskType;
  @Input() compact = false; // Для компактного отображения (только иконка)
  @Input() hideIcon = false; // Для скрытия иконки

  getTaskTypeIcon(iconName?: string): string {
    if (!iconName) return 'task';

    // Если уже валидная иконка Material, возвращаем как есть
    const validIcons = ['task', 'phone', 'event', 'email', 'description', 'visibility', 'priority_high'];
    if (validIcons.includes(iconName)) {
      return iconName;
    }

    // Маппинг для других названий
    const iconMap: { [key: string]: string } = {
      'звонок': 'phone',
      'встреча': 'event',
      'просмотр': 'visibility',
      'документы': 'description',
      'срочный': 'priority_high',
      'важный': 'priority_high'
    };

    return iconMap[iconName.toLowerCase()] || 'task';
  }
}
