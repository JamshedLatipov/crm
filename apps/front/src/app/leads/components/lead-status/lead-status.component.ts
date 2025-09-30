import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { LeadStatus } from '../../models/lead.model';

@Component({
  selector: 'app-lead-status',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './lead-status.component.html',
  styleUrls: ['./lead-status.component.scss']
})
export class LeadStatusComponent {
  @Input() status!: LeadStatus;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIcon = true;

  private statusLabels = {
    [LeadStatus.NEW]: 'Новый',
    [LeadStatus.CONTACTED]: 'Контакт установлен',
    [LeadStatus.QUALIFIED]: 'Квалифицирован',
    [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
    [LeadStatus.NEGOTIATING]: 'Переговоры',
    [LeadStatus.CONVERTED]: 'Конвертирован',
    [LeadStatus.REJECTED]: 'Отклонен',
    [LeadStatus.LOST]: 'Потерян',
  };

  getStatusLabel(): string {
    return this.statusLabels[this.status] || this.status;
  }

  getStatusClass(): string {
    return `status-chip status-${this.status} size-${this.size}`;
  }
}