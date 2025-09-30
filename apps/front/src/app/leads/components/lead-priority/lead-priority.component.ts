import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { LeadPriority } from '../../models/lead.model';

@Component({
  selector: 'app-lead-priority',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './lead-priority.component.html',
  styleUrls: ['./lead-priority.component.scss']
})
export class LeadPriorityComponent {
  @Input() priority!: LeadPriority;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIcon = true;

  private priorityLabels = {
    [LeadPriority.LOW]: 'Низкий',
    [LeadPriority.MEDIUM]: 'Средний',
    [LeadPriority.HIGH]: 'Высокий',
    [LeadPriority.URGENT]: 'Срочный',
  };

  getPriorityLabel(): string {
    return this.priorityLabels[this.priority] || this.priority;
  }

  getPriorityClass(): string {
    return `priority-chip priority-${this.priority} size-${this.size}`;
  }
}