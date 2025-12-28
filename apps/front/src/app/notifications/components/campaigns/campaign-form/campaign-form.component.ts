import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CampaignService } from '../../../services/campaign.service';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { CreateCampaignDto, CampaignType, NotificationChannel } from '../../../models/notification.models';

@Component({
  selector: 'app-campaign-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDividerModule,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      [title]="campaignId() ? 'Редактировать кампанию' : 'Новая кампания'"
      [subtitle]="campaignId() ? 'Изменение настроек кампании' : 'Создание новой кампании уведомлений'"
    >
      <div page-actions>
        <button mat-stroked-button (click)="cancel()" [disabled]="loading()">
          <mat-icon>close</mat-icon>
          Отмена
        </button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || loading()">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>save</mat-icon>
          }
          Сохранить
        </button>
      </div>

      @if (loading() && !form.value.name) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="form-container">
          <div class="form-layout">
            <!-- Main Form Card -->
            <mat-card class="form-card">
              <form [formGroup]="form">
                <!-- Basic Info Section -->
                <div class="form-section">
                  <h3 class="section-title">
                    <mat-icon>info</mat-icon>
                    Основная информация
                  </h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Название кампании</mat-label>
                    <input matInput formControlName="name" placeholder="Например: Летняя распродажа 2025">
                    <mat-icon matPrefix>campaign</mat-icon>
                    @if (form.get('name')?.hasError('required')) {
                      <mat-error>Название обязательно</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Описание</mat-label>
                    <textarea matInput formControlName="description" rows="3" placeholder="Опишите цель кампании и целевую аудиторию"></textarea>
                    <mat-icon matPrefix>description</mat-icon>
                    <mat-hint>Это поможет вам и вашей команде понять назначение кампании</mat-hint>
                  </mat-form-field>
                </div>

                <mat-divider></mat-divider>

                <!-- Channel & Template Section -->
                <div class="form-section">
                  <h3 class="section-title">
                    <mat-icon>send</mat-icon>
                    Канал и шаблон
                  </h3>
                  
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Канал отправки</mat-label>
                      <mat-select formControlName="channel" (selectionChange)="onChannelChange()">
                        <mat-option value="SMS">
                          <div class="channel-option">
                            <mat-icon>sms</mat-icon>
                            <span>SMS</span>
                          </div>
                        </mat-option>
                        <mat-option value="EMAIL">
                          <div class="channel-option">
                            <mat-icon>email</mat-icon>
                            <span>Email</span>
                          </div>
                        </mat-option>
                        <mat-option value="MULTI">
                          <div class="channel-option">
                            <mat-icon>layers</mat-icon>
                            <span>Мультиканальная</span>
                          </div>
                        </mat-option>
                      </mat-select>
                      <mat-icon matPrefix>send</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Шаблон</mat-label>
                      <mat-select formControlName="templateId" (selectionChange)="onTemplateChange($event)">
                        @if (availableTemplates().length === 0) {
                          <mat-option disabled>Загрузка...</mat-option>
                        }
                        @for (template of availableTemplates(); track template.id) {
                          <mat-option [value]="template.id">
                            {{ template.name }}
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matPrefix>description</mat-icon>
                      @if (form.get('templateId')?.hasError('required')) {
                        <mat-error>Выберите шаблон</mat-error>
                      }
                      <mat-hint>Выберите шаблон сообщения для отправки</mat-hint>
                    </mat-form-field>
                  </div>

                  @if (selectedTemplate()) {
                    <div class="template-preview">
                      <div class="preview-header">
                        <mat-icon>visibility</mat-icon>
                        <span>Предпросмотр шаблона</span>
                      </div>
                      <div class="preview-content">
                        {{ selectedTemplate()?.content }}
                      </div>
                      @if (selectedTemplate()?.variables && selectedTemplate()!.variables.length > 0) {
                        <div class="preview-variables">
                          <span class="variables-label">Переменные:</span>
                          @for (variable of selectedTemplate()!.variables; track variable) {
                            <span class="variable-chip">{{'{{'}}{{ variable }}{{'}}'}}</span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>

                <mat-divider></mat-divider>

                <!-- Audience Section -->
                <div class="form-section">
                  <h3 class="section-title">
                    <mat-icon>people</mat-icon>
                    Целевая аудитория
                  </h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Сегмент получателей</mat-label>
                    <mat-select formControlName="segmentId">
                      <mat-option value="">Все контакты</mat-option>
                      <mat-option value="segment-1">VIP клиенты (245 контактов)</mat-option>
                      <mat-option value="segment-2">Новые подписчики (1,234 контакта)</mat-option>
                      <mat-option value="segment-3">Активные за 30 дней (567 контактов)</mat-option>
                    </mat-select>
                    <mat-icon matPrefix>filter_list</mat-icon>
                    @if (form.get('segmentId')?.hasError('required')) {
                      <mat-error>Выберите сегмент</mat-error>
                    }
                    <mat-hint>Выберите сегмент или отправьте всем</mat-hint>
                  </mat-form-field>
                </div>

                <mat-divider></mat-divider>

                <!-- Schedule Section -->
                <div class="form-section">
                  <h3 class="section-title">
                    <mat-icon>schedule</mat-icon>
                    Планирование отправки
                  </h3>
                  
                  <div class="schedule-type">
                    <mat-slide-toggle formControlName="isScheduled" (change)="onScheduleToggle()">
                      {{ form.get('isScheduled')?.value ? 'Отложенная отправка' : 'Немедленная отправка' }}
                    </mat-slide-toggle>
                  </div>

                  @if (form.get('isScheduled')?.value) {
                    <div class="form-grid" style="margin-top: 16px;">
                      <mat-form-field appearance="outline">
                        <mat-label>Дата отправки</mat-label>
                        <input matInput [matDatepicker]="picker" formControlName="scheduledAt" [min]="minDate">
                        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                        <mat-datepicker #picker></mat-datepicker>
                        <mat-icon matPrefix>event</mat-icon>
                        @if (form.get('scheduledAt')?.hasError('required')) {
                          <mat-error>Выберите дату</mat-error>
                        }
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Время отправки</mat-label>
                        <input matInput type="time" formControlName="scheduledTime">
                        <mat-icon matPrefix>access_time</mat-icon>
                        @if (form.get('scheduledTime')?.hasError('required')) {
                          <mat-error>Выберите время</mat-error>
                        }
                      </mat-form-field>
                    </div>
                  }
                </div>

                <mat-divider></mat-divider>

                <!-- Advanced Settings Section -->
                <div class="form-section">
                  <h3 class="section-title">
                    <mat-icon>tune</mat-icon>
                    Дополнительные настройки
                  </h3>
                  
                  <div class="settings-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Скорость отправки (сообщений/мин)</mat-label>
                      <input matInput type="number" formControlName="sendingSpeed" min="1" max="1000">
                      <mat-icon matPrefix>speed</mat-icon>
                      <mat-hint>Рекомендуется: 100-500</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Максимум попыток</mat-label>
                      <input matInput type="number" formControlName="maxRetries" min="0" max="5">
                      <mat-icon matPrefix>repeat</mat-icon>
                      <mat-hint>При ошибке доставки</mat-hint>
                    </mat-form-field>
                  </div>

                  <div class="toggle-group">
                    <mat-slide-toggle formControlName="trackDelivery">
                      <div class="toggle-content">
                        <span class="toggle-title">Отслеживать доставку</span>
                        <span class="toggle-hint">Получать статусы доставки сообщений</span>
                      </div>
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="retryFailed">
                      <div class="toggle-content">
                        <span class="toggle-title">Повторять при ошибке</span>
                        <span class="toggle-hint">Автоматически повторять неудачные отправки</span>
                      </div>
                    </mat-slide-toggle>
                  </div>
                </div>
              </form>
            </mat-card>

            <!-- Sidebar Card -->
            <mat-card class="sidebar-card">
              <div class="sidebar-section">
                <h3 class="sidebar-title">
                  <mat-icon>info</mat-icon>
                  Информация
                </h3>
                
                <div class="info-item">
                  <mat-icon>groups</mat-icon>
                  <div class="info-content">
                    <span class="info-label">Получателей</span>
                    <span class="info-value">{{ estimatedRecipients() }}</span>
                  </div>
                </div>

                <div class="info-item">
                  <mat-icon>attach_money</mat-icon>
                  <div class="info-content">
                    <span class="info-label">Примерная стоимость</span>
                    <span class="info-value">{{ estimatedCost() }} ₽</span>
                  </div>
                </div>

                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div class="info-content">
                    <span class="info-label">Время отправки</span>
                    <span class="info-value">{{ estimatedDuration() }}</span>
                  </div>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="sidebar-section">
                <h3 class="sidebar-title">
                  <mat-icon>tips_and_updates</mat-icon>
                  Советы
                </h3>
                
                <ul class="tips-list">
                  <li>
                    <mat-icon>check_circle</mat-icon>
                    <span>Тестируйте кампанию на небольшой группе перед массовой рассылкой</span>
                  </li>
                  <li>
                    <mat-icon>check_circle</mat-icon>
                    <span>Персонализируйте сообщения с помощью переменных</span>
                  </li>
                  <li>
                    <mat-icon>check_circle</mat-icon>
                    <span>Отправляйте в оптимальное время (10:00-20:00)</span>
                  </li>
                  <li>
                    <mat-icon>check_circle</mat-icon>
                    <span>Соблюдайте баланс между частотой отправок</span>
                  </li>
                </ul>
              </div>

              <mat-divider></mat-divider>

              <div class="sidebar-section">
                <h3 class="sidebar-title">
                  <mat-icon>policy</mat-icon>
                  Рекомендации
                </h3>
                
                <div class="recommendation-box">
                  <mat-icon>lightbulb</mat-icon>
                  <div>
                    <p><strong>Оптимальная скорость:</strong> 100-300 сообщений/мин</p>
                    <p><strong>Лучшее время:</strong> Будние дни, 10:00-19:00</p>
                    <p><strong>Длина SMS:</strong> До 160 символов (1 SMS)</p>
                  </div>
                </div>
              </div>
            </mat-card>
          </div>
        </div>
      }
    </app-page-layout>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
    }

    .form-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .form-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 24px;
      
      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
      }
    }

    .form-card,
    .sidebar-card {
      padding: 32px;
    }

    .form-section {
      margin-bottom: 32px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 24px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      
      mat-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 0;
    }

    mat-divider {
      margin: 32px 0;
    }

    .channel-option {
      display: flex;
      align-items: center;
      gap: 8px;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .template-preview {
      margin-top: 16px;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--primary-color);
      }
    }

    .preview-content {
      font-size: 14px;
      line-height: 1.6;
      color: #4b5563;
      padding: 12px;
      background: white;
      border-radius: 6px;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }

    .preview-variables {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .variables-label {
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
    }

    .variable-chip {
      display: inline-block;
      padding: 4px 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .schedule-type {
      margin-bottom: 8px;
      
      mat-slide-toggle {
        ::ng-deep .mdc-switch {
          --mdc-switch-selected-handle-color: var(--primary-color);
          --mdc-switch-selected-track-color: var(--primary-color);
        }
      }
    }

    .toggle-group {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 16px;
    }

    .toggle-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .toggle-title {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .toggle-hint {
      font-size: 12px;
      color: #6b7280;
    }

    // Sidebar Styles
    .sidebar-card {
      height: fit-content;
      position: sticky;
      top: 24px;
    }

    .sidebar-section {
      margin-bottom: 24px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px 0;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--primary-color);
      }
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      > mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--primary-color);
      }
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .info-label {
      font-size: 12px;
      color: #6b7280;
    }

    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 0;
        border-bottom: 1px solid #f3f4f6;
        
        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        &:first-child {
          padding-top: 0;
        }
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        span {
          font-size: 13px;
          line-height: 1.5;
          color: #4b5563;
        }
      }
    }

    .recommendation-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 8px;
      
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #d97706;
        flex-shrink: 0;
      }
      
      p {
        font-size: 13px;
        line-height: 1.6;
        color: #78350f;
        margin: 0 0 8px 0;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        strong {
          font-weight: 600;
        }
      }
    }
  `]
})
export class CampaignFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campaignService = inject(CampaignService);
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  form!: FormGroup;
  campaignId = signal<string | null>(null);
  loading = signal(false);
  minDate = new Date();

  availableTemplates = this.smsTemplateService.templates;
  selectedTemplate = signal<any>(null);

  estimatedRecipients = computed(() => {
    const segmentId = this.form?.get('segmentId')?.value;
    if (!segmentId) return '0';
    // Mock data - в реальности нужно получать из API
    const segments: Record<string, number> = {
      'segment-1': 245,
      'segment-2': 1234,
      'segment-3': 567
    };
    return (segments[segmentId] || 0).toLocaleString('ru-RU');
  });

  estimatedCost = computed(() => {
    const recipients = parseInt(this.estimatedRecipients().replace(/\s/g, '')) || 0;
    const costPerMessage = 1.5; // Примерная стоимость за SMS
    return (recipients * costPerMessage).toFixed(2);
  });

  estimatedDuration = computed(() => {
    const recipients = parseInt(this.estimatedRecipients().replace(/\s/g, '')) || 0;
    const speed = this.form?.get('sendingSpeed')?.value || 100;
    const minutes = Math.ceil(recipients / speed);
    if (minutes < 60) return `~${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `~${hours}ч ${mins}мин`;
  });

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.campaignId.set(id);
    
    // Загружаем шаблоны
    this.smsTemplateService.getAll().subscribe();
    
    if (id && id !== 'new') {
      this.loadCampaign(id);
    }
  }

  loadCampaign(id: string) {
    this.loading.set(true);
    this.campaignService.getById(id).subscribe({
      next: (campaign) => {
        this.form.patchValue({
          name: campaign.name,
          channel: campaign.type,
          description: campaign.description || campaign.name,
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
          isScheduled: !!campaign.scheduledAt,
          templateId: campaign.templateId,
          segmentId: campaign.segmentId
        });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки кампании', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/notifications/campaigns']);
      }
    });
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      channel: ['SMS', Validators.required],
      templateId: ['', Validators.required],
      segmentId: ['', Validators.required],
      isScheduled: [false],
      scheduledAt: [null],
      scheduledTime: [''],
      sendingSpeed: [100],
      maxRetries: [3],
      trackDelivery: [true],
      retryFailed: [true]
    });
  }

  onChannelChange() {
    // Сбросить выбранный шаблон при смене канала
    this.form.patchValue({ templateId: '' });
    this.selectedTemplate.set(null);
    // Загрузить шаблоны для выбранного канала
    this.smsTemplateService.getAll().subscribe();
  }

  onTemplateChange(event: any) {
    const templateId = event.value;
    const template = this.availableTemplates().find(t => t.id === templateId);
    this.selectedTemplate.set(template || null);
  }

  onScheduleToggle() {
    const isScheduled = this.form.get('isScheduled')?.value;
    if (isScheduled) {
      this.form.get('scheduledAt')?.setValidators([Validators.required]);
      this.form.get('scheduledTime')?.setValidators([Validators.required]);
    } else {
      this.form.get('scheduledAt')?.clearValidators();
      this.form.get('scheduledTime')?.clearValidators();
      this.form.patchValue({ scheduledAt: null, scheduledTime: '' });
    }
    this.form.get('scheduledAt')?.updateValueAndValidity();
    this.form.get('scheduledTime')?.updateValueAndValidity();
  }

  save() {
    if (this.form.invalid || this.loading()) {
      // Показать ошибки валидации
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.snackBar.open('Заполните все обязательные поля', 'Закрыть', { duration: 3000 });
      return;
    }

    let scheduledDateTime = null;
    if (this.form.value.isScheduled && this.form.value.scheduledAt && this.form.value.scheduledTime) {
      const date = new Date(this.form.value.scheduledAt);
      const [hours, minutes] = this.form.value.scheduledTime.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      scheduledDateTime = date;
    }

    const dto: CreateCampaignDto = {
      name: this.form.value.name!,
      description: this.form.value.description,
      type: this.form.value.isScheduled ? CampaignType.SCHEDULED : CampaignType.IMMEDIATE,
      templateId: this.form.value.templateId!,
      segmentId: this.form.value.segmentId!,
      scheduledAt: scheduledDateTime,
      settings: {
        sendingSpeed: this.form.value.sendingSpeed,
        maxRetries: this.form.value.maxRetries,
        retryFailedMessages: this.form.value.retryFailed,
        trackDelivery: this.form.value.trackDelivery
      }
    };

    this.loading.set(true);

    const operation = this.campaignId()
      ? this.campaignService.update(this.campaignId()!, dto)
      : this.campaignService.create(dto);

    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.campaignId() ? 'Кампания обновлена' : 'Кампания создана',
          'Закрыть',
          { duration: 3000 }
        );
        this.router.navigate(['/notifications/campaigns']);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка сохранения кампании',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/notifications/campaigns']);
  }
}
