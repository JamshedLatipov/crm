import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LeadService } from '../services/lead.service';
import { Lead } from '../models/lead.model';
import { Manager, UserService } from '../../shared/services/user.service';

interface AssignLeadData {
  lead: Lead;
  currentAssignee?: string;
}

@Component({
  selector: 'app-assign-lead-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>person_add</mat-icon>
        Назначить ответственного
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
            <div class="current-assignee" *ngIf="data.currentAssignee">
              Текущий ответственный: 
              <mat-chip class="assignee-chip" selected>
                {{ getCurrentAssigneeName() }}
              </mat-chip>
            </div>
            <div class="no-assignee" *ngIf="!data.currentAssignee">
              <mat-icon>person_off</mat-icon>
              Ответственный не назначен
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Assignment Form -->
      <form [formGroup]="assignForm" class="assign-form">
        <!-- Assignment Type -->
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Тип назначения</mat-label>
          <mat-select formControlName="assignmentType">
            <mat-option value="single">Один ответственный</mat-option>
            <mat-option value="team">Команда</mat-option>
            <mat-option value="auto">Автоматическое распределение</mat-option>
          </mat-select>
          <mat-icon matSuffix>assignment_ind</mat-icon>
        </mat-form-field>

        <!-- Manager Selection (Single) -->
        <div *ngIf="assignForm.get('assignmentType')?.value === 'single'" class="manager-selection">
          <h3>Выберите менеджера</h3>
          <div class="managers-grid">
            <div
              *ngFor="let manager of availableManagers"
              class="manager-card"
              [class.selected]="selectedManager?.id === manager.id"
              [class.overloaded]="manager.isOverloaded"
              (click)="selectManager(manager)"
              (keyup.enter)="selectManager(manager)"
              (keyup.space)="selectManager(manager)"
              tabindex="0"
              role="button"
              [attr.aria-pressed]="selectedManager?.id === manager.id"
            >
              <div class="manager-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="manager-info">
                <div class="manager-name">{{ manager.fullName }}</div>
                <div class="manager-role">{{ getRoleLabel(manager.roles) }}</div>
                <div class="manager-department">{{ manager.department }}</div>
                <div class="manager-workload" [class.high]="manager.isOverloaded">
                  Активных лидов: {{ manager.currentLeadsCount }} / {{ manager.maxLeadsCapacity }}
                </div>
                <div class="manager-percentage" [class.high]="manager.workloadPercentage > 80">
                  Загрузка: {{ manager.workloadPercentage | number:'1.0-0' }}%
                </div>
              </div>
              <div class="manager-status">
                <mat-icon *ngIf="manager.isOverloaded" class="warning-icon">warning</mat-icon>
                <mat-icon *ngIf="!manager.isOverloaded && manager.isAvailableForAssignment" class="available-icon">check_circle</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Team Selection -->
        <div *ngIf="assignForm.get('assignmentType')?.value === 'team'" class="team-selection">
          <h3>Выберите команду</h3>
          <mat-selection-list [(ngModel)]="selectedTeamMembers" [multiple]="true">
            <mat-list-option 
              *ngFor="let manager of availableManagers" 
              [value]="manager.id"
              [disabled]="!manager.isAvailableForAssignment"
            >
            {{manager | json}}
              <div class="team-member-item">
                <div class="member-avatar">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ manager.fullName }}</div>
                  <div class="member-role">{{ getRoleLabel(manager.roles) }}</div>
                  <div class="member-workload" [class.high]="manager.isOverloaded">
                    {{ manager.currentLeadsCount }} / {{ manager.maxLeadsCapacity }} активных лидов
                  </div>
                </div>
                <mat-icon *ngIf="!manager.isAvailableForAssignment" class="warning-icon">block</mat-icon>
              </div>
            </mat-list-option>
          </mat-selection-list>
        </div>

        <!-- Auto Assignment -->
        <div *ngIf="assignForm.get('assignmentType')?.value === 'auto'" class="auto-assignment">
          <mat-card class="auto-card">
            <mat-card-content>
              <div class="auto-info">
                <mat-icon class="auto-icon">auto_awesome</mat-icon>
                <div>
                  <h4>Автоматическое назначение</h4>
                  <p>Система автоматически назначит наименее загруженного менеджера с подходящими навыками</p>
                </div>
              </div>
              
              <mat-form-field class="full-width" appearance="outline">
                <mat-label>Критерии назначения</mat-label>
                <mat-select formControlName="autoAssignCriteria" multiple>
                  <mat-option value="workload">Наименьшая загрузка</mat-option>
                  <mat-option value="expertise">Экспертиза в отрасли</mat-option>
                  <mat-option value="performance">Лучшие показатели</mat-option>
                  <mat-option value="geography">Географическое соответствие</mat-option>
                </mat-select>
              </mat-form-field>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Assignment Notes -->
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Комментарий к назначению</mat-label>
          <textarea
            matInput
            formControlName="notes"
            placeholder="Добавьте комментарий о причине назначения..."
            rows="3"
          ></textarea>
          <mat-icon matSuffix>comment</mat-icon>
        </mat-form-field>

        <!-- Priority Assignment -->
        <div class="priority-section">
          <mat-checkbox formControlName="highPriority">
            Приоритетное назначение
          </mat-checkbox>
          <mat-checkbox formControlName="notifyAssignee">
            Уведомить ответственного
          </mat-checkbox>
          <mat-checkbox formControlName="scheduleFollowUp">
            Запланировать контрольный звонок
          </mat-checkbox>
        </div>
      </form>

      <!-- Assignment Preview -->
      <div class="assignment-preview" *ngIf="getAssignmentPreview()">
        <h4>Предварительный просмотр назначения:</h4>
        <div class="preview-content">
          {{ getAssignmentPreview() }}
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
        (click)="assignLead()"
        [disabled]="!isAssignmentValid() || loading"
      >
        <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
        <span *ngIf="!loading">Назначить</span>
        <span *ngIf="loading">Назначение...</span>
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

    .current-assignee {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.875rem;
    }

    .no-assignee {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.875rem;
    }

    .assignee-chip {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .assign-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .manager-selection h3,
    .team-selection h3 {
      margin: 16px 0 12px;
      font-size: 1rem;
      font-weight: 500;
    }

    .managers-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
    }

    .manager-card {
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

    .manager-card:hover {
      border-color: #1976d2;
      background: #f5f5f5;
    }

    .manager-card:focus {
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .manager-card.selected {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .manager-card.overloaded {
      border-color: #ff9800;
      background: #fff3e0;
    }

    .manager-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .manager-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .manager-avatar mat-icon {
      color: rgba(0, 0, 0, 0.6);
    }

    .manager-info {
      flex: 1;
    }

    .manager-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .manager-role {
      font-size: 0.875rem;
      color: #1976d2;
      margin-bottom: 2px;
    }

    .manager-department {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 4px;
    }

    .manager-workload {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .manager-workload.high {
      color: #f57c00;
      font-weight: 500;
    }

    .manager-status {
      display: flex;
      align-items: center;
    }

    .warning-icon {
      color: #ff9800;
    }

    .available-icon {
      color: #4caf50;
    }

    .team-member-item {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .member-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .member-info {
      flex: 1;
    }

    .member-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .member-role {
      font-size: 0.75rem;
      color: #1976d2;
    }

    .member-workload {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .member-workload.high {
      color: #f57c00;
    }

    .auto-assignment {
      margin: 16px 0;
    }

    .auto-card {
      background: #f8f9fa;
    }

    .auto-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .auto-icon {
      color: #1976d2;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .auto-info h4 {
      margin: 0 0 4px;
      font-size: 1rem;
      font-weight: 500;
    }

    .auto-info p {
      margin: 0;
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.4;
    }

    .priority-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .assignment-preview {
      margin-top: 16px;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 8px;
    }

    .assignment-preview h4 {
      margin: 0 0 8px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .preview-content {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.8);
    }
  `]
})
export class AssignLeadDialogComponent {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<AssignLeadDialogComponent>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<AssignLeadData>(MAT_DIALOG_DATA);

  assignForm: FormGroup;
  selectedManager: Manager | null = null;
  selectedTeamMembers: string[] = [];
  loading = false;

  // Real data from API
  availableManagers: Manager[] = [];

  private roleLabels = {
    'SALES_MANAGER': 'Менеджер по продажам',
    'SENIOR_MANAGER': 'Старший менеджер',
    'TEAM_LEAD': 'Руководитель группы',
    'ACCOUNT_MANAGER': 'Аккаунт-менеджер'
  };

  constructor() {
    this.assignForm = this.formBuilder.group({
      assignmentType: ['single', Validators.required],
      autoAssignCriteria: [['workload']],
      notes: [''],
      highPriority: [false],
      notifyAssignee: [true],
      scheduleFollowUp: [false]
    });

    this.loadManagers();
  }

  private loadManagers(): void {
    this.loading = true;
    this.userService.getManagers().subscribe({
      next: (managers) => {
        this.availableManagers = managers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.loading = false;
      }
    });
  }

  selectManager(manager: Manager): void {
    if (manager.currentLeadsCount < manager.maxLeadsCapacity) {
      this.selectedManager = manager;
    }
  }

  getRoleLabel(roles: string[]): string {
    console.log(roles);
    if (!roles || roles.length === 0) return 'Неизвестная роль';
    
    const role = roles.find(r => this.roleLabels[r as keyof typeof this.roleLabels]);
    return this.roleLabels[role as keyof typeof this.roleLabels] || roles[0];
  }

  getAssignmentPreview(): string {
    const assignmentType = this.assignForm.get('assignmentType')?.value;
    
    switch (assignmentType) {
      case 'single':
        return this.selectedManager 
          ? `Лид будет назначен менеджеру ${this.selectedManager.fullName} (${this.getRoleLabel(this.selectedManager.roles)})`
          : '';
      
      case 'team':
        if (this.selectedTeamMembers.length > 0) {
          const memberNames = this.selectedTeamMembers
            .map(id => this.availableManagers.find(m => m.id === id)?.fullName)
            .filter(Boolean)
            .join(', ');
          return `Лид будет назначен команде: ${memberNames}`;
        }
        return '';
      
      case 'auto':
        return 'Система автоматически выберет наиболее подходящего менеджера на основе выбранных критериев';
      
      default:
        return '';
    }
  }

  isAssignmentValid(): boolean {
    const assignmentType = this.assignForm.get('assignmentType')?.value;
    
    switch (assignmentType) {
      case 'single':
        return !!this.selectedManager;
      case 'team':
        return this.selectedTeamMembers.length > 0;
      case 'auto':
        return true;
      default:
        return false;
    }
  }

  getCurrentAssigneeName(): string {
    const id = this.data.currentAssignee;
    if (!id) return '';
    const manager = this.availableManagers.find(m => m.id?.toString() === id?.toString());
    return manager?.fullName || id;
  }

  assignLead(): void {
    if (!this.isAssignmentValid()) {
      return;
    }

    this.loading = true;
    const assignmentType = this.assignForm.get('assignmentType')?.value;
    
    let assigneeId: string;
    
    switch (assignmentType) {
      case 'single': {
        if (this.selectedManager) {
          assigneeId = this.selectedManager.id.toString();
        } else {
          this.loading = false;
          return;
        }
        break;
      }
      
      case 'team': {
        // Для команды берем первого участника как основного ответственного
        assigneeId = this.selectedTeamMembers[0];
        break;
      }
      
      case 'auto': {
        // Автоматически выбираем менеджера с наименьшей загрузкой
        const availableManager = this.availableManagers
          .filter(m => m.currentLeadsCount < m.maxLeadsCapacity)
          .sort((a, b) => a.currentLeadsCount - b.currentLeadsCount)[0];
        assigneeId = availableManager?.id.toString() || this.availableManagers[0].id.toString();
        break;
      }
      
      default: {
        this.loading = false;
        return;
      }
    }

    this.leadService.assignLead(this.data.lead.id, assigneeId).subscribe({
      next: (updatedLead) => {
        // Если есть комментарий, добавляем его как заметку
        const notes = this.assignForm.get('notes')?.value;
        if (notes?.trim()) {
          const assignedManager = this.availableManagers.find(m => m.id.toString() === assigneeId);
          const noteContent = `Назначен ответственный: ${assignedManager?.fullName || assigneeId}.\n\nКомментарий: ${notes.trim()}`;
          
          this.leadService.addNote(this.data.lead.id, noteContent).subscribe({
            next: () => {
              this.dialogRef.close(updatedLead);
            },
            error: (error) => {
              console.error('Error adding note:', error);
              // Все равно закрываем диалог, так как назначение уже выполнено
              this.dialogRef.close(updatedLead);
            }
          });
        } else {
          this.dialogRef.close(updatedLead);
        }
      },
      error: (error) => {
        console.error('Error assigning lead:', error);
        this.loading = false;
        // TODO: Показать уведомление об ошибке
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
