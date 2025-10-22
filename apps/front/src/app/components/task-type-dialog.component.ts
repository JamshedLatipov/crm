import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TaskType, CreateTaskTypeDto, UpdateTaskTypeDto } from '../services/task-type.service';

export interface TaskTypeDialogData {
  taskType?: TaskType;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-task-type-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>{{ data.mode === 'create' ? 'add_circle' : 'edit' }}</mat-icon>
          {{ data.mode === 'create' ? 'Создать тип задачи' : 'Редактировать тип задачи' }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <form [formGroup]="form">
          <mat-tab-group>
            <!-- Основная информация -->
            <mat-tab label="Основное">
              <div class="tab-content">
                <div class="form-section">
                  <h3>Основная информация</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Название типа</mat-label>
                    <input matInput formControlName="name" placeholder="Например: Звонок клиенту" required>
                    <mat-icon matPrefix>label</mat-icon>
                    <mat-error *ngIf="form.get('name')?.hasError('required')">
                      Название обязательно
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Описание</mat-label>
                    <textarea 
                      matInput 
                      formControlName="description" 
                      rows="3"
                      placeholder="Опишите назначение этого типа задач"></textarea>
                    <mat-icon matPrefix>description</mat-icon>
                  </mat-form-field>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Цвет</mat-label>
                      <input 
                        matInput 
                        type="color" 
                        formControlName="color"
                        class="color-input">
                      <mat-icon matPrefix>palette</mat-icon>
                      <mat-hint>Цвет для визуального отображения</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Иконка</mat-label>
                      <mat-select formControlName="icon">
                        <mat-option *ngFor="let icon of availableIcons" [value]="icon.value">
                          <mat-icon>{{ icon.value }}</mat-icon>
                          {{ icon.label }}
                        </mat-option>
                      </mat-select>
                      <mat-icon matPrefix>interests</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="preview-section">
                    <p class="preview-label">Предпросмотр:</p>
                    <div class="type-preview" [style.background-color]="form.get('color')?.value">
                      <mat-icon>{{ form.get('icon')?.value || 'task' }}</mat-icon>
                      <span>{{ form.get('name')?.value || 'Название типа' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Временные рамки -->
            <mat-tab label="Временные рамки">
              <div class="tab-content" formGroupName="timeFrameSettings">
                <div class="form-section">
                  <h3>Длительность задачи</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Длительность по умолчанию (минуты)</mat-label>
                    <input matInput type="number" formControlName="defaultDuration" min="0">
                    <mat-icon matPrefix>schedule</mat-icon>
                    <mat-hint>Время на выполнение задачи по умолчанию</mat-hint>
                  </mat-form-field>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Минимальная длительность (минуты)</mat-label>
                      <input matInput type="number" formControlName="minDuration" min="0">
                      <mat-icon matPrefix>timer</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Максимальная длительность (минуты)</mat-label>
                      <input matInput type="number" formControlName="maxDuration" min="0">
                      <mat-icon matPrefix>timer_off</mat-icon>
                    </mat-form-field>
                  </div>

                  <mat-slide-toggle formControlName="allowNoDueDate" class="full-width">
                    Разрешить задачи без дедлайна
                  </mat-slide-toggle>
                </div>

                <mat-divider></mat-divider>

                <div class="form-section">
                  <h3>Напоминания</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Напоминание за N минут до дедлайна</mat-label>
                    <input matInput type="number" formControlName="reminderBeforeDeadline" min="0">
                    <mat-icon matPrefix>notifications</mat-icon>
                    <mat-hint>Создать напоминание за указанное время</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Предупреждение за N минут</mat-label>
                    <input matInput type="number" formControlName="warningBeforeDeadline" min="0">
                    <mat-icon matPrefix>warning</mat-icon>
                    <mat-hint>Показать предупреждение о приближающемся дедлайне</mat-hint>
                  </mat-form-field>
                </div>
              </div>
            </mat-tab>

            <!-- Рабочее время -->
            <mat-tab label="Рабочее время">
              <div class="tab-content" formGroupName="timeFrameSettings">
                <div class="form-section">
                  <h3>Рабочие дни</h3>
                  <p class="section-hint">Выберите дни, когда задачи этого типа могут выполняться</p>
                  
                  <div class="days-selector">
                    <mat-checkbox 
                      *ngFor="let day of weekDays" 
                      [checked]="isDaySelected(day.value)"
                      (change)="toggleDay(day.value)">
                      {{ day.label }}
                    </mat-checkbox>
                  </div>

                  <mat-slide-toggle formControlName="skipWeekends" class="full-width">
                    Автоматически пропускать выходные дни
                    <mat-icon matTooltip="Если дедлайн выпадает на выходной, он будет перенесен на следующий рабочий день">
                      help_outline
                    </mat-icon>
                  </mat-slide-toggle>
                </div>

                <mat-divider></mat-divider>

                <div class="form-section" formGroupName="workingHours">
                  <h3>Рабочие часы</h3>
                  
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Начало рабочего дня</mat-label>
                      <input matInput type="time" formControlName="start">
                      <mat-icon matPrefix>schedule</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Конец рабочего дня</mat-label>
                      <input matInput type="time" formControlName="end">
                      <mat-icon matPrefix>schedule</mat-icon>
                    </mat-form-field>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- SLA -->
            <mat-tab label="SLA">
              <div class="tab-content" formGroupName="timeFrameSettings">
                <div class="form-section">
                  <h3>Service Level Agreement</h3>
                  <p class="section-hint">Установите целевое время ответа и решения</p>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>SLA: Время ответа (минуты)</mat-label>
                    <input matInput type="number" formControlName="slaResponseTime" min="0">
                    <mat-icon matPrefix>speed</mat-icon>
                    <mat-hint>Максимальное время для первого ответа</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>SLA: Время решения (минуты)</mat-label>
                    <input matInput type="number" formControlName="slaResolutionTime" min="0">
                    <mat-icon matPrefix>done_all</mat-icon>
                    <mat-hint>Максимальное время для полного решения</mat-hint>
                  </mat-form-field>

                  <div class="sla-preview" *ngIf="form.get('timeFrameSettings.slaResponseTime')?.value || form.get('timeFrameSettings.slaResolutionTime')?.value">
                    <mat-icon>info</mat-icon>
                    <div class="sla-info">
                      <p *ngIf="form.get('timeFrameSettings.slaResponseTime')?.value">
                        Ответ: {{ formatMinutes(form.get('timeFrameSettings.slaResponseTime')?.value) }}
                      </p>
                      <p *ngIf="form.get('timeFrameSettings.slaResolutionTime')?.value">
                        Решение: {{ formatMinutes(form.get('timeFrameSettings.slaResolutionTime')?.value) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Дополнительно -->
            <mat-tab label="Дополнительно">
              <div class="tab-content">
                <div class="form-section">
                  <h3>Настройки отображения</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Порядок сортировки</mat-label>
                    <input matInput type="number" formControlName="sortOrder" min="0">
                    <mat-icon matPrefix>sort</mat-icon>
                    <mat-hint>Меньшее число = выше в списке</mat-hint>
                  </mat-form-field>

                  <mat-slide-toggle formControlName="isActive" class="full-width">
                    Активный тип
                  </mat-slide-toggle>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-button mat-dialog-close>Отмена</button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="save()"
          [disabled]="form.invalid || saving">
          <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
          {{ saving ? 'Сохранение...' : (data.mode === 'create' ? 'Создать' : 'Сохранить') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid #e0e0e0;
      
      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
    }

    mat-dialog-content {
      padding: 0 !important;
      overflow-y: auto;
      flex: 1;
    }

    .tab-content {
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;

      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
      }

      .section-hint {
        margin: -8px 0 16px 0;
        font-size: 13px;
        color: #64748b;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .half-width {
      width: 100%;
    }

    .color-input {
      height: 40px;
      cursor: pointer;
    }

    .preview-section {
      margin-top: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;

      .preview-label {
        margin: 0 0 12px 0;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
      }

      .type-preview {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .days-selector {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    mat-divider {
      margin: 24px 0;
    }

    mat-slide-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #64748b;
        cursor: help;
      }
    }

    .sla-preview {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: 8px;
      margin-top: 16px;

      mat-icon {
        color: #3b82f6;
        flex-shrink: 0;
      }

      .sla-info {
        flex: 1;

        p {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #1e293b;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    ::ng-deep {
      .mat-mdc-tab-body-content {
        overflow: visible !important;
      }
    }
  `]
})
export class TaskTypeDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  availableIcons = [
    { value: 'phone', label: 'Телефон' },
    { value: 'email', label: 'Email' },
    { value: 'calendar_today', label: 'Календарь' },
    { value: 'event', label: 'Событие' },
    { value: 'assignment', label: 'Задание' },
    { value: 'check_circle', label: 'Проверка' },
    { value: 'business_center', label: 'Бизнес' },
    { value: 'folder', label: 'Папка' },
    { value: 'description', label: 'Документ' },
    { value: 'support_agent', label: 'Поддержка' },
    { value: 'call', label: 'Звонок' },
    { value: 'message', label: 'Сообщение' },
    { value: 'notifications', label: 'Уведомление' },
    { value: 'task', label: 'Задача' },
    { value: 'work', label: 'Работа' },
  ];

  weekDays = [
    { value: 1, label: 'Понедельник' },
    { value: 2, label: 'Вторник' },
    { value: 3, label: 'Среда' },
    { value: 4, label: 'Четверг' },
    { value: 5, label: 'Пятница' },
    { value: 6, label: 'Суббота' },
    { value: 7, label: 'Воскресенье' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TaskTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskTypeDialogData
  ) {}

  ngOnInit() {
    this.initForm();
    if (this.data.taskType) {
      this.loadTaskType(this.data.taskType);
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      color: ['#3B82F6'],
      icon: ['task'],
      sortOrder: [0],
      isActive: [true],
      timeFrameSettings: this.fb.group({
        defaultDuration: [null],
        minDuration: [null],
        maxDuration: [null],
        warningBeforeDeadline: [null],
        reminderBeforeDeadline: [null],
        allowNoDueDate: [true],
        workingDays: [[]],
        workingHours: this.fb.group({
          start: ['09:00'],
          end: ['18:00']
        }),
        skipWeekends: [false],
        slaResponseTime: [null],
        slaResolutionTime: [null]
      })
    });
  }

  loadTaskType(taskType: TaskType) {
    this.form.patchValue({
      name: taskType.name,
      description: taskType.description,
      color: taskType.color,
      icon: taskType.icon,
      sortOrder: taskType.sortOrder,
      isActive: taskType.isActive,
      timeFrameSettings: {
        ...taskType.timeFrameSettings,
        workingHours: taskType.timeFrameSettings?.workingHours || { start: '09:00', end: '18:00' }
      }
    });
  }

  isDaySelected(day: number): boolean {
    const workingDays = this.form.get('timeFrameSettings.workingDays')?.value || [];
    return workingDays.includes(day);
  }

  toggleDay(day: number) {
    const workingDaysControl = this.form.get('timeFrameSettings.workingDays');
    const currentDays = workingDaysControl?.value || [];
    
    const index = currentDays.indexOf(day);
    if (index > -1) {
      currentDays.splice(index, 1);
    } else {
      currentDays.push(day);
    }
    
    workingDaysControl?.setValue([...currentDays].sort());
  }

  formatMinutes(minutes: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} минут`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} часов`;
    return `${hours} ч ${mins} мин`;
  }

  save() {
    if (this.form.invalid) return;

    this.saving = true;
    const formValue = this.form.value;
    
    // Очищаем пустые значения в timeFrameSettings
    const timeFrameSettings = { ...formValue.timeFrameSettings };
    Object.keys(timeFrameSettings).forEach(key => {
      if (timeFrameSettings[key] === null || timeFrameSettings[key] === '') {
        delete timeFrameSettings[key];
      }
    });

    // Если workingHours пустые, удаляем
    if (timeFrameSettings.workingHours?.start === '' || timeFrameSettings.workingHours?.end === '') {
      delete timeFrameSettings.workingHours;
    }

    const result = {
      ...formValue,
      timeFrameSettings: Object.keys(timeFrameSettings).length > 0 ? timeFrameSettings : null
    };

    this.dialogRef.close(result);
  }
}
