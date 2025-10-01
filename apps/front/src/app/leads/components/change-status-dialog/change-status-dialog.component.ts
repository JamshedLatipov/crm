import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { LeadService } from '../../services/lead.service';
import { Lead, LeadStatus } from '../../models/lead.model';
import { LeadStatusComponent } from '../lead-status/lead-status.component';

interface ChangeStatusData {
  lead: Lead;
  currentStatus: LeadStatus;
}

@Component({
  selector: 'app-change-status-dialog',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    LeadStatusComponent,
  ],
  templateUrl: './change-status-dialog.component.html',
  styleUrls: ['./change-status-dialog.component.scss'],
})
export class ChangeStatusDialogComponent {
  readonly data = inject<ChangeStatusData>(MAT_DIALOG_DATA);
  selectedStatus: LeadStatus | null = null;
  notes = '';
  loading = false;

  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(
    MatDialogRef<ChangeStatusDialogComponent>
  );

  // Финальные статусы, которые нельзя изменить
  private finalStatuses = [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];

  get isFinalStatus(): boolean {
    return this.finalStatuses.includes(this.data.currentStatus);
  }

  get finalStatusMessage(): string {
    const statusMessages: Record<LeadStatus, string> = {
      [LeadStatus.CONVERTED]: 'Этот лид уже конвертирован в клиента. Изменение статуса невозможно.',
      [LeadStatus.REJECTED]: 'Этот лид был отклонен. Изменение статуса невозможно.',
      [LeadStatus.LOST]: 'Этот лид был потерян. Изменение статуса невозможно.',
      [LeadStatus.NEW]: '',
      [LeadStatus.CONTACTED]: '',
      [LeadStatus.QUALIFIED]: '',
      [LeadStatus.PROPOSAL_SENT]: '',
      [LeadStatus.NEGOTIATING]: '',
    };
    return statusMessages[this.data.currentStatus] || '';
  }

  availableStatuses = [
    {
      value: LeadStatus.NEW,
      label: 'Новый',
      description: 'Лид только что создан и требует первичной обработки',
      icon: 'fiber_new',
    },
    {
      value: LeadStatus.CONTACTED,
      label: 'Контакт установлен',
      description: 'Первичный контакт установлен, лид проявил интерес',
      icon: 'contact_phone',
    },
    {
      value: LeadStatus.QUALIFIED,
      label: 'Квалифицирован',
      description: 'Лид соответствует критериям целевой аудитории',
      icon: 'verified',
    },
    {
      value: LeadStatus.PROPOSAL_SENT,
      label: 'Предложение отправлено',
      description: 'Коммерческое предложение отправлено клиенту',
      icon: 'send',
    },
    {
      value: LeadStatus.NEGOTIATING,
      label: 'Переговоры',
      description: 'Ведутся активные переговоры по условиям сделки',
      icon: 'handshake',
    },
    {
      value: LeadStatus.CONVERTED,
      label: 'Конвертирован',
      description: 'Лид успешно конвертирован в клиента',
      icon: 'check_circle',
    },
    {
      value: LeadStatus.REJECTED,
      label: 'Отклонен',
      description: 'Клиент отклонил предложение',
      icon: 'cancel',
    },
    {
      value: LeadStatus.LOST,
      label: 'Потерян',
      description: 'Лид потерян по техническим или иным причинам',
      icon: 'remove_circle',
    },
  ];

  get displayStatuses() {
    // Для существующего лида (есть id) не показываем опцию NEW
    const isExisting =
      !!this.data.lead?.id && this.data.currentStatus !== LeadStatus.NEW;
    if (isExisting) {
      return this.availableStatuses.filter((s) => s.value !== LeadStatus.NEW);
    }
    return this.availableStatuses;
  }

  getStatusProgress(status: LeadStatus): number {
    const progressMap: Record<LeadStatus, number> = {
      [LeadStatus.NEW]: 10,
      [LeadStatus.CONTACTED]: 25,
      [LeadStatus.QUALIFIED]: 40,
      [LeadStatus.PROPOSAL_SENT]: 60,
      [LeadStatus.NEGOTIATING]: 80,
      [LeadStatus.CONVERTED]: 100,
      [LeadStatus.REJECTED]: 0,
      [LeadStatus.LOST]: 0,
    };
    return progressMap[status] || 0;
  }

  getStatusColor(status: LeadStatus): string {
    const colorMap: Record<LeadStatus, string> = {
      [LeadStatus.NEW]: '#4caf50',
      [LeadStatus.CONTACTED]: '#2196f3',
      [LeadStatus.QUALIFIED]: '#ffc107',
      [LeadStatus.PROPOSAL_SENT]: '#9c27b0',
      [LeadStatus.NEGOTIATING]: '#ff5722',
      [LeadStatus.CONVERTED]: '#4caf50',
      [LeadStatus.REJECTED]: '#f44336',
      [LeadStatus.LOST]: '#616161',
    };
    return colorMap[status] || '#616161';
  }

  isValidTransition(fromStatus: LeadStatus, toStatus: LeadStatus): boolean {
    // Определяем логические переходы между статусами
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.REJECTED, LeadStatus.LOST],
      [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.REJECTED, LeadStatus.LOST],
      [LeadStatus.QUALIFIED]: [LeadStatus.PROPOSAL_SENT, LeadStatus.NEGOTIATING, LeadStatus.REJECTED, LeadStatus.LOST],
      [LeadStatus.PROPOSAL_SENT]: [LeadStatus.NEGOTIATING, LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST],
      [LeadStatus.NEGOTIATING]: [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST],
      [LeadStatus.CONVERTED]: [], // Финальный статус
      [LeadStatus.REJECTED]: [LeadStatus.CONTACTED], // Можно вернуть в работу
      [LeadStatus.LOST]: [LeadStatus.CONTACTED], // Можно вернуть в работу
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  private statusLabels: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: 'Новый',
    [LeadStatus.CONTACTED]: 'Контакт установлен',
    [LeadStatus.QUALIFIED]: 'Квалифицирован',
    [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
    [LeadStatus.NEGOTIATING]: 'Переговоры',
    [LeadStatus.CONVERTED]: 'Конвертирован',
    [LeadStatus.REJECTED]: 'Отклонен',
    [LeadStatus.LOST]: 'Потерян',
  };

  selectStatus(status: LeadStatus): void {
    if (status !== this.data.currentStatus) this.selectedStatus = status;
  }

  getStatusLabel(status: LeadStatus): string {
    return this.statusLabels[status] || String(status);
  }

  getNextSteps(
    status: LeadStatus
  ): Array<{ icon: string; description: string }> {
    const steps: Record<
      LeadStatus,
      Array<{ icon: string; description: string }>
    > = {
      [LeadStatus.NEW]: [
        { icon: 'call', description: 'Связаться с лидом в течение 24 часов' },
        { icon: 'assignment', description: 'Провести квалификацию' },
      ],
      [LeadStatus.CONTACTED]: [
        { icon: 'quiz', description: 'Провести квалификационный разговор' },
        { icon: 'event', description: 'Запланировать следующий контакт' },
      ],
      [LeadStatus.QUALIFIED]: [
        {
          icon: 'description',
          description: 'Подготовить коммерческое предложение',
        },
        { icon: 'schedule', description: 'Презентация решения' },
      ],
      [LeadStatus.PROPOSAL_SENT]: [
        { icon: 'call', description: 'Отследить получение предложения' },
        { icon: 'chat', description: 'Обсудить условия' },
      ],
      [LeadStatus.NEGOTIATING]: [
        { icon: 'gavel', description: 'Согласовать финальные условия' },
        { icon: 'document_scanner', description: 'Подготовить договор' },
      ],
      [LeadStatus.CONVERTED]: [
        { icon: 'celebration', description: 'Поздравить команду с успехом!' },
        { icon: 'support', description: 'Передать клиента в отдел поддержки' },
      ],
      [LeadStatus.REJECTED]: [
        { icon: 'feedback', description: 'Собрать обратную связь' },
        { icon: 'schedule', description: 'Запланировать повторный контакт' },
      ],
      [LeadStatus.LOST]: [
        { icon: 'analytics', description: 'Проанализировать причины потери' },
        { icon: 'school', description: 'Извлечь уроки для будущих лидов' },
      ],
    };

    return steps[status] || [];
  }

  changeStatus(): void {
    if (!this.selectedStatus || this.selectedStatus === this.data.currentStatus)
      return;
    this.loading = true;
    this.leadService
      .updateLeadStatus(this.data.lead.id, this.selectedStatus)
      .subscribe({
        next: (updatedLead: Lead) => {
          if (this.notes && this.notes.trim() && this.selectedStatus) {
            this.leadService
              .addNote(
                this.data.lead.id,
                `Статус изменен на "${this.getStatusLabel(
                  this.selectedStatus
                )}".\n\nКомментарий: ${this.notes.trim()}`
              )
              .subscribe({
                next: () => this.dialogRef.close(updatedLead),
                error: () => this.dialogRef.close(updatedLead),
              });
          } else {
            this.dialogRef.close(updatedLead);
          }
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('Error updating status:', error);
          this.loading = false;
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
