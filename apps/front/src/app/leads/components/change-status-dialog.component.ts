import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { LeadService } from '../services/lead.service';
import { Lead, LeadStatus } from '../models/lead.model';

interface ChangeStatusData {
  lead: Lead;
  currentStatus: LeadStatus;
}

@Component({
  selector: 'app-change-status-dialog',
  standalone: true,
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
    MatChipsModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>swap_horiz</mat-icon>
        Изменить статус лида
      </h2>
      <button mat-icon-button (click)="close()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <!-- Lead Info -->
      <mat-card class="lead-info">
        <mat-card-content>
          <div class="lead-summary">
            <div class="lead-name">{{ data.lead.name }}</div>
            <div class="lead-details">
              <span *ngIf="data.lead.company">{{ data.lead.company }}</span>
              <span *ngIf="data.lead.email">{{ data.lead.email }}</span>
            </div>
            <div class="current-status">
              Текущий статус: 
              <mat-chip [class]="'status-chip status-' + data.currentStatus" selected>
                {{ getStatusLabel(data.currentStatus) }}
              </mat-chip>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Status Selection -->
      <div class="status-section">
        <h3>Выберите новый статус</h3>
        <div class="status-grid">
          <div
            *ngFor="let status of availableStatuses"
            class="status-option"
            [class.selected]="selectedStatus === status.value"
            [class.disabled]="status.value === data.currentStatus"
            (click)="selectStatus(status.value)"
            (keyup.enter)="selectStatus(status.value)"
            (keyup.space)="selectStatus(status.value)"
            tabindex="0"
            role="button"
            [attr.aria-pressed]="selectedStatus === status.value"
          >
            <div class="status-icon">
              <mat-icon>{{ status.icon }}</mat-icon>
            </div>
            <div class="status-info">
              <div class="status-name">{{ status.label }}</div>
              <div class="status-description">{{ status.description }}</div>
            </div>
            <div class="status-indicator" *ngIf="selectedStatus === status.value">
              <mat-icon>check_circle</mat-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <mat-form-field class="full-width" appearance="outline">
        <mat-label>Комментарий к изменению статуса</mat-label>
        <textarea
          matInput
          [(ngModel)]="notes"
          placeholder="Добавьте комментарий о причине изменения статуса..."
          rows="3"
        ></textarea>
        <mat-icon matSuffix>comment</mat-icon>
      </mat-form-field>

      <!-- Status Flow Info -->
      <div class="status-flow" *ngIf="selectedStatus">
        <h4>Следующие шаги:</h4>
        <div class="next-steps">
          <div *ngFor="let step of getNextSteps(selectedStatus)" class="step-item">
            <mat-icon class="step-icon">{{ step.icon }}</mat-icon>
            <span>{{ step.description }}</span>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button (click)="close()">
        Отмена
      </button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="changeStatus()"
        [disabled]="!selectedStatus || selectedStatus === data.currentStatus || loading"
      >
        <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
        <span *ngIf="!loading">Изменить статус</span>
        <span *ngIf="loading">Сохранение...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 0;
      margin-bottom: 16px;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .close-button {
      margin-left: auto;
    }

    .dialog-content {
      padding: 0 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .dialog-actions {
      padding: 16px 24px 20px;
      justify-content: flex-end;
      gap: 12px;
    }

    .lead-info {
      margin-bottom: 24px;
      background: #f8f9fa;
    }

    .lead-summary {
      text-align: center;
    }

    .lead-name {
      font-size: 1.125rem;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .lead-details {
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 12px;
    }

    .lead-details span {
      margin-right: 16px;
    }

    .current-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.875rem;
    }

    .status-section h3 {
      margin: 24px 0 16px;
      font-size: 1rem;
      font-weight: 500;
    }

    .status-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .status-option {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      outline: none;
    }

    .status-option:hover:not(.disabled) {
      border-color: #1976d2;
      background: #f5f5f5;
    }

    .status-option:focus:not(.disabled) {
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .status-option.selected {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .status-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #fafafa;
    }

    .status-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
    }

    .status-option.selected .status-icon {
      background: #1976d2;
      color: white;
    }

    .status-info {
      flex: 1;
    }

    .status-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .status-description {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.4;
    }

    .status-indicator {
      color: #1976d2;
    }

    .full-width {
      width: 100%;
      margin: 16px 0;
    }

    .status-flow {
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .status-flow h4 {
      margin: 0 0 12px;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.8);
    }

    .next-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.7);
    }

    .step-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #1976d2;
    }

    .status-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .status-new { background-color: #e3f2fd !important; color: #1976d2 !important; }
    .status-contacted { background-color: #f3e5f5 !important; color: #7b1fa2 !important; }
    .status-qualified { background-color: #e8f5e8 !important; color: #388e3c !important; }
    .status-proposal_sent { background-color: #fff3e0 !important; color: #f57c00 !important; }
    .status-negotiating { background-color: #fce4ec !important; color: #c2185b !important; }
    .status-converted { background-color: #e8f5e8 !important; color: #2e7d32 !important; }
    .status-rejected { background-color: #ffebee !important; color: #d32f2f !important; }
    .status-lost { background-color: #fafafa !important; color: #616161 !important; }
  `]
})
export class ChangeStatusDialogComponent {
  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(MatDialogRef<ChangeStatusDialogComponent>);
  readonly data = inject<ChangeStatusData>(MAT_DIALOG_DATA);

  selectedStatus: LeadStatus | null = null;
  notes = '';
  loading = false;

  availableStatuses = [
    {
      value: LeadStatus.NEW,
      label: 'Новый',
      description: 'Лид только что создан и требует первичной обработки',
      icon: 'fiber_new'
    },
    {
      value: LeadStatus.CONTACTED,
      label: 'Контакт установлен',
      description: 'Первичный контакт установлен, лид проявил интерес',
      icon: 'contact_phone'
    },
    {
      value: LeadStatus.QUALIFIED,
      label: 'Квалифицирован',
      description: 'Лид соответствует критериям целевой аудитории',
      icon: 'verified'
    },
    {
      value: LeadStatus.PROPOSAL_SENT,
      label: 'Предложение отправлено',
      description: 'Коммерческое предложение отправлено клиенту',
      icon: 'send'
    },
    {
      value: LeadStatus.NEGOTIATING,
      label: 'Переговоры',
      description: 'Ведутся активные переговоры по условиям сделки',
      icon: 'handshake'
    },
    {
      value: LeadStatus.CONVERTED,
      label: 'Конвертирован',
      description: 'Лид успешно конвертирован в клиента',
      icon: 'check_circle'
    },
    {
      value: LeadStatus.REJECTED,
      label: 'Отклонен',
      description: 'Клиент отклонил предложение',
      icon: 'cancel'
    },
    {
      value: LeadStatus.LOST,
      label: 'Потерян',
      description: 'Лид потерян по техническим или иным причинам',
      icon: 'remove_circle'
    }
  ];

  private statusLabels = {
    [LeadStatus.NEW]: 'Новый',
    [LeadStatus.CONTACTED]: 'Контакт установлен',
    [LeadStatus.QUALIFIED]: 'Квалифицирован',
    [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
    [LeadStatus.NEGOTIATING]: 'Переговоры',
    [LeadStatus.CONVERTED]: 'Конвертирован',
    [LeadStatus.REJECTED]: 'Отклонен',
    [LeadStatus.LOST]: 'Потерян'
  };

  selectStatus(status: LeadStatus): void {
    if (status !== this.data.currentStatus) {
      this.selectedStatus = status;
    }
  }

  getStatusLabel(status: LeadStatus): string {
    return this.statusLabels[status] || status;
  }

  getNextSteps(status: LeadStatus): Array<{icon: string, description: string}> {
    const steps: Record<LeadStatus, Array<{icon: string, description: string}>> = {
      [LeadStatus.NEW]: [
        { icon: 'call', description: 'Связаться с лидом в течение 24 часов' },
        { icon: 'assignment', description: 'Провести квалификацию' }
      ],
      [LeadStatus.CONTACTED]: [
        { icon: 'quiz', description: 'Провести квалификационный разговор' },
        { icon: 'event', description: 'Запланировать следующий контакт' }
      ],
      [LeadStatus.QUALIFIED]: [
        { icon: 'description', description: 'Подготовить коммерческое предложение' },
        { icon: 'schedule', description: 'Презентация решения' }
      ],
      [LeadStatus.PROPOSAL_SENT]: [
        { icon: 'call', description: 'Отследить получение предложения' },
        { icon: 'chat', description: 'Обсудить условия и ответить на вопросы' }
      ],
      [LeadStatus.NEGOTIATING]: [
        { icon: 'gavel', description: 'Согласовать финальные условия' },
        { icon: 'document_scanner', description: 'Подготовить договор' }
      ],
      [LeadStatus.CONVERTED]: [
        { icon: 'celebration', description: 'Поздравить команду с успехом!' },
        { icon: 'support', description: 'Передать клиента в отдел поддержки' }
      ],
      [LeadStatus.REJECTED]: [
        { icon: 'feedback', description: 'Собрать обратную связь' },
        { icon: 'schedule', description: 'Запланировать повторный контакт через время' }
      ],
      [LeadStatus.LOST]: [
        { icon: 'analytics', description: 'Проанализировать причины потери' },
        { icon: 'school', description: 'Извлечь уроки для будущих лидов' }
      ]
    };

    return steps[status] || [];
  }

  changeStatus(): void {
    if (!this.selectedStatus || this.selectedStatus === this.data.currentStatus) {
      return;
    }

    this.loading = true;

    this.leadService.updateLeadStatus(this.data.lead.id, this.selectedStatus).subscribe({
      next: (updatedLead) => {
        // Если есть комментарий, добавляем его как заметку
        if (this.notes.trim() && this.selectedStatus) {
          this.leadService.addNote(this.data.lead.id, 
            `Статус изменен на "${this.getStatusLabel(this.selectedStatus)}".\n\nКомментарий: ${this.notes.trim()}`
          ).subscribe({
            next: () => {
              this.dialogRef.close(updatedLead);
            },
            error: (error) => {
              console.error('Error adding note:', error);
              // Все равно закрываем диалог, так как статус уже изменен
              this.dialogRef.close(updatedLead);
            }
          });
        } else {
          this.dialogRef.close(updatedLead);
        }
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.loading = false;
        // TODO: Показать уведомление об ошибке
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
