import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CampaignService } from '../../../services/campaign.service';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { EmailTemplateService } from '../../../services/email-template.service';
import { WhatsAppTemplateService } from '../../../services/whatsapp-template.service';
import { TelegramTemplateService } from '../../../services/telegram-template.service';
import { SegmentService } from '../../../services/segment.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { CreateCampaignDto, CampaignType, SmsTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-campaign-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    PageLayoutComponent,
    CurrencyFormatPipe,
  ],
  template: `
    <app-page-layout
      title="Мастер создания кампании"
      subtitle="Пошаговое создание кампании за 5 простых шагов"
    >
      <div page-actions>
        <button mat-stroked-button (click)="cancel()">
          <mat-icon>close</mat-icon>
          Отмена
        </button>
      </div>

      <div class="wizard-container">
        <div class="wizard-layout">
          <!-- Progress Sidebar -->
          <div class="progress-sidebar">
            <h3 class="sidebar-title">Прогресс</h3>
            <div class="progress-steps">
              @for (step of steps; track step.index) {
                <div class="progress-step" [class.active]="currentStep() === step.index" [class.completed]="currentStep() > step.index">
                  <div class="step-indicator">
                    @if (currentStep() > step.index) {
                      <mat-icon>check</mat-icon>
                    } @else {
                      <span>{{ step.index + 1 }}</span>
                    }
                  </div>
                  <div class="step-info">
                    <div class="step-label">{{ step.label }}</div>
                    <div class="step-description">{{ step.description }}</div>
                  </div>
                </div>
              }
            </div>

            <mat-divider style="margin: 24px 0;"></mat-divider>

            <div class="campaign-summary">
              <h4>Краткая информация</h4>
              <div class="summary-item">
                <mat-icon>campaign</mat-icon>
                <span>{{ basicInfoForm.get('name')?.value || 'Не указано' }}</span>
              </div>
              <div class="summary-item">
                <mat-icon>send</mat-icon>
                <span>{{ getChannelLabel(channelForm.get('channel')?.value) }}</span>
              </div>
              <div class="summary-item">
                <mat-icon>people</mat-icon>
                <span>{{ getSegmentLabel(audienceForm.get('segmentId')?.value) }}</span>
              </div>
            </div>
          </div>

          <!-- Main Wizard Content -->
          <div class="wizard-content">
            <mat-card class="wizard-card">
              <mat-stepper [linear]="true" #stepper (selectionChange)="onStepChange($event)">
                
                <!-- Step 1: Basic Info -->
                <mat-step [stepControl]="basicInfoForm" label="Основная информация">
                  <div class="step-container">
                    <div class="step-header">
                      <mat-icon class="step-icon">info</mat-icon>
                      <div>
                        <h2>Основная информация</h2>
                        <p>Дайте название вашей кампании и опишите ее цель</p>
                      </div>
                    </div>

                    <form [formGroup]="basicInfoForm" class="step-form">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Название кампании</mat-label>
                        <input matInput formControlName="name" placeholder="Например: Летняя распродажа 2025">
                        <mat-icon matPrefix>campaign</mat-icon>
                        @if (basicInfoForm.get('name')?.hasError('required')) {
                          <mat-error>Название обязательно</mat-error>
                        }
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Описание кампании</mat-label>
                        <textarea matInput formControlName="description" rows="4" 
                                  placeholder="Опишите цель и особенности кампании"></textarea>
                        <mat-icon matPrefix>description</mat-icon>
                        <mat-hint>Это поможет вам отслеживать назначение кампании</mat-hint>
                      </mat-form-field>
                    </form>

                    <div class="step-actions">
                      <button mat-raised-button color="primary" matStepperNext [disabled]="basicInfoForm.invalid">
                        Далее
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-step>

                <!-- Step 2: Channel Selection -->
                <mat-step [stepControl]="channelForm" label="Выбор канала">
                  <div class="step-container">
                    <div class="step-header">
                      <mat-icon class="step-icon">send</mat-icon>
                      <div>
                        <h2>Выберите канал отправки</h2>
                        <p>Определите, как будут доставлены ваши сообщения</p>
                      </div>
                    </div>

                    <form [formGroup]="channelForm" class="step-form">
                      <div class="channel-grid">
                        <mat-card class="channel-card" [class.selected]="channelForm.get('channel')?.value === 'SMS'" (click)="selectChannel('SMS')">
                          <div class="channel-content">
                            <mat-icon class="channel-icon">sms</mat-icon>
                            <h3>SMS</h3>
                            <p>Быстрая доставка текстовых сообщений</p>
                            <div class="channel-features">
                              <span class="feature-badge">98% Open Rate</span>
                              <span class="feature-badge">3-5 сек доставка</span>
                            </div>
                          </div>
                        </mat-card>

                        <mat-card class="channel-card" [class.selected]="channelForm.get('channel')?.value === 'EMAIL'" (click)="selectChannel('EMAIL')">
                          <div class="channel-content">
                            <mat-icon class="channel-icon">email</mat-icon>
                            <h3>Email</h3>
                            <p>Детальные сообщения с форматированием</p>
                            <div class="channel-features">
                              <span class="feature-badge">HTML поддержка</span>
                              <span class="feature-badge">Вложения</span>
                            </div>
                          </div>
                        </mat-card>

                        <mat-card class="channel-card" [class.selected]="channelForm.get('channel')?.value === 'WHATSAPP'" (click)="selectChannel('WHATSAPP')">
                          <div class="channel-content">
                            <mat-icon class="channel-icon">chat</mat-icon>
                            <h3>WhatsApp</h3>
                            <p>Мгновенные сообщения через WhatsApp</p>
                            <div class="channel-features">
                              <span class="feature-badge">Высокий отклик</span>
                              <span class="feature-badge">Медиа файлы</span>
                            </div>
                          </div>
                        </mat-card>

                        <mat-card class="channel-card" [class.selected]="channelForm.get('channel')?.value === 'TELEGRAM'" (click)="selectChannel('TELEGRAM')">
                          <div class="channel-content">
                            <mat-icon class="channel-icon">telegram</mat-icon>
                            <h3>Telegram</h3>
                            <p>Быстрая доставка через Telegram Bot</p>
                            <div class="channel-features">
                              <span class="feature-badge">Мгновенная доставка</span>
                              <span class="feature-badge">Интерактивность</span>
                            </div>
                          </div>
                        </mat-card>

                        <mat-card class="channel-card" [class.selected]="channelForm.get('channel')?.value === 'MULTI'" (click)="selectChannel('MULTI')">
                          <div class="channel-content">
                            <mat-icon class="channel-icon">layers</mat-icon>
                            <h3>Мультиканальная</h3>
                            <p>Отправка через несколько каналов</p>
                            <div class="channel-features">
                              <span class="feature-badge">Максимальный охват</span>
                              <span class="feature-badge">Fallback</span>
                            </div>
                          </div>
                        </mat-card>
                      </div>
                    </form>

                    <div class="step-actions">
                      <button mat-button matStepperPrevious>
                        <mat-icon>arrow_back</mat-icon>
                        Назад
                      </button>
                      <button mat-raised-button color="primary" matStepperNext [disabled]="channelForm.invalid">
                        Далее
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-step>

                <!-- Step 3: Template Selection -->
                <mat-step [stepControl]="contentForm" label="Выбор шаблона">
                  <div class="step-container">
                    <div class="step-header">
                      <mat-icon class="step-icon">description</mat-icon>
                      <div>
                        <h2>Выберите шаблон сообщения</h2>
                        <p>Используйте готовый шаблон или создайте новый</p>
                      </div>
                    </div>

                    <form [formGroup]="contentForm" class="step-form">
                      @if (loadingTemplates()) {
                        <div class="loading-state">
                          <mat-spinner diameter="40"></mat-spinner>
                          <p>Загрузка шаблонов...</p>
                        </div>
                      } @else if (availableTemplates().length === 0) {
                        <div class="empty-state">
                          <mat-icon>description</mat-icon>
                          <h3>Нет доступных шаблонов</h3>
                          <p>Создайте первый шаблон для использования в кампаниях</p>
                          <button mat-raised-button color="primary" (click)="createNewTemplate()">
                            <mat-icon>add</mat-icon>
                            Создать шаблон
                          </button>
                        </div>
                      } @else {
                        <div class="templates-grid">
                          @for (template of availableTemplates(); track template.id) {
                            <mat-card class="template-card p-2" 
                                      [class.selected]="contentForm.get('templateId')?.value === template.id"
                                      (click)="selectTemplate(template)">
                              <div class="template-header">
                                <h4>{{ template.name }}</h4>
                                @if (template.isActive) {
                                  <span class="status-badge active">Активен</span>
                                } @else {
                                  <span class="status-badge">Неактивен</span>
                                }
                              </div>
                              <div class="template-content">
                                {{ getTemplatePreview(template) }}
                              </div>
                              <div class="template-stats">
                                <span><mat-icon>description</mat-icon> {{ template.category || 'Без категории' }}</span>
                              </div>
                            </mat-card>
                          }
                        </div>
                      }
                    </form>

                    <div class="step-actions">
                      <button mat-button matStepperPrevious>
                        <mat-icon>arrow_back</mat-icon>
                        Назад
                      </button>
                      <button mat-raised-button color="primary" matStepperNext [disabled]="contentForm.invalid">
                        Далее
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-step>

                <!-- Step 4: Audience Selection -->
                <mat-step [stepControl]="audienceForm" label="Целевая аудитория">
                  <div class="step-container">
                    <div class="step-header">
                      <mat-icon class="step-icon">people</mat-icon>
                      <div>
                        <h2>Выберите получателей</h2>
                        <p>Определите, кто получит ваше сообщение</p>
                      </div>
                    </div>

                    <form [formGroup]="audienceForm" class="step-form">
                      @if (loadingSegments()) {
                        <div class="loading-state">
                          <mat-spinner diameter="40"></mat-spinner>
                          <p>Загрузка сегментов...</p>
                        </div>
                      } @else if (availableSegments().length === 0) {
                        <div class="empty-state">
                          <mat-icon>segment</mat-icon>
                          <h3>Нет доступных сегментов</h3>
                          <p>Создайте сегмент аудитории для отправки кампаний</p>
                          <button mat-raised-button color="primary" routerLink="/messages/segments/new">
                            <mat-icon>add</mat-icon>
                            Создать сегмент
                          </button>
                        </div>
                      } @else {
                        <div class="segments-grid">
                          <!-- Опция "Все контакты" всегда доступна -->
                          <mat-card class="segment-card" [class.selected]="audienceForm.get('segmentId')?.value === null" (click)="selectSegment(null)">
                            <div class="segment-content">
                              <mat-icon class="segment-icon">groups</mat-icon>
                              <h4>Все контакты</h4>
                              <p>Отправить всем контактам в базе</p>
                              <div class="segment-count">
                                <mat-icon>person</mat-icon>
                                <span>Все активные</span>
                              </div>
                            </div>
                          </mat-card>

                          <!-- Динамические сегменты из сервиса -->
                          @for (segment of availableSegments(); track segment.id) {
                            <mat-card class="segment-card" [class.selected]="audienceForm.get('segmentId')?.value === segment.id" (click)="selectSegment(segment.id)">
                              <div class="segment-content">
                                <mat-icon class="segment-icon">{{ segment.isDynamic ? 'autorenew' : 'filter_list' }}</mat-icon>
                                <h4>{{ segment.name }}</h4>
                                <p>{{ segment.description || 'Сегмент контактов' }}</p>
                                <div class="segment-count">
                                  <mat-icon>person</mat-icon>
                                  <span>{{ segment.contactsCount | number }} {{ segment.isDynamic ? '(динамический)' : 'контактов' }}</span>
                                </div>
                              </div>
                            </mat-card>
                          }
                        </div>
                      }
                    </form>

                    <div class="step-actions">
                      <button mat-button matStepperPrevious>
                        <mat-icon>arrow_back</mat-icon>
                        Назад
                      </button>
                      <button mat-raised-button color="primary" matStepperNext [disabled]="audienceForm.invalid">
                        Далее
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-step>

                <!-- Step 5: Schedule & Confirm -->
                <mat-step [stepControl]="scheduleForm" label="Планирование">
                  <div class="step-container">
                    <div class="step-header">
                      <mat-icon class="step-icon">schedule</mat-icon>
                      <div>
                        <h2>Планирование отправки</h2>
                        <p>Выберите, когда запустить кампанию</p>
                      </div>
                    </div>

                    <form [formGroup]="scheduleForm" class="step-form">
                      <div class="schedule-type-group">
                        <mat-card class="schedule-type-card" [class.selected]="scheduleForm.get('scheduleType')?.value === 'immediate'" (click)="selectScheduleType('immediate')">
                          <div class="schedule-type-content">
                            <mat-icon>flash_on</mat-icon>
                            <h4>Немедленная отправка</h4>
                            <p>Начать отправку сразу после создания</p>
                          </div>
                        </mat-card>

                        <mat-card class="schedule-type-card" [class.selected]="scheduleForm.get('scheduleType')?.value === 'scheduled'" (click)="selectScheduleType('scheduled')">
                          <div class="schedule-type-content">
                            <mat-icon>event</mat-icon>
                            <h4>Отложенная отправка</h4>
                            <p>Запланировать на определенное время</p>
                          </div>
                        </mat-card>
                      </div>

                      @if (scheduleForm.get('scheduleType')?.value === 'scheduled') {
                        <div class="schedule-details">
                          <div class="form-row">
                            <mat-form-field appearance="outline">
                              <mat-label>Дата отправки</mat-label>
                              <input matInput [matDatepicker]="picker" formControlName="scheduledDate" [min]="minDate">
                              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                              <mat-datepicker #picker></mat-datepicker>
                              <mat-icon matPrefix>event</mat-icon>
                            </mat-form-field>

                            <mat-form-field appearance="outline">
                              <mat-label>Время отправки</mat-label>
                              <input matInput type="time" formControlName="scheduledTime">
                              <mat-icon matPrefix>access_time</mat-icon>
                            </mat-form-field>
                          </div>
                        </div>
                      }

                      <mat-divider style="margin: 24px 0;"></mat-divider>

                      <!-- Campaign Summary -->
                      <div class="final-summary">
                        <h3>
                          <mat-icon>summarize</mat-icon>
                          Итоговая информация
                        </h3>

                        <div class="summary-grid">
                          <div class="summary-card">
                            <mat-icon>campaign</mat-icon>
                            <div>
                              <span class="summary-label">Название</span>
                              <span class="summary-value">{{ basicInfoForm.get('name')?.value }}</span>
                            </div>
                          </div>

                          <div class="summary-card">
                            <mat-icon>send</mat-icon>
                            <div>
                              <span class="summary-label">Канал</span>
                              <span class="summary-value">{{ getChannelLabel(channelForm.get('channel')?.value) }}</span>
                            </div>
                          </div>

                          <div class="summary-card">
                            <mat-icon>description</mat-icon>
                            <div>
                              <span class="summary-label">Шаблон</span>
                              <span class="summary-value">{{ getTemplateName(contentForm.get('templateId')?.value) }}</span>
                            </div>
                          </div>

                          <div class="summary-card">
                            <mat-icon>people</mat-icon>
                            <div>
                              <span class="summary-label">Получателей</span>
                              <span class="summary-value">{{ getRecipientCount(audienceForm.get('segmentId')?.value) }}</span>
                            </div>
                          </div>

                          <div class="summary-card">
                            <mat-icon>attach_money</mat-icon>
                            <div>
                              <span class="summary-label">Примерная стоимость</span>
                              <span class="summary-value">{{ estimatedCost() | currencyFormat }}</span>
                            </div>
                          </div>

                          <div class="summary-card">
                            <mat-icon>schedule</mat-icon>
                            <div>
                              <span class="summary-label">Время доставки</span>
                              <span class="summary-value">{{ estimatedDuration() }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>

                    <div class="step-actions">
                      <button mat-button matStepperPrevious>
                        <mat-icon>arrow_back</mat-icon>
                        Назад
                      </button>
                      <button mat-raised-button color="primary" (click)="createCampaign()" [disabled]="loading() || scheduleForm.invalid">
                        @if (loading()) {
                          <mat-spinner diameter="20"></mat-spinner>
                        } @else {
                          <mat-icon>rocket_launch</mat-icon>
                        }
                        Создать кампанию
                      </button>
                    </div>
                  </div>
                </mat-step>

              </mat-stepper>
            </mat-card>
          </div>
        </div>
      </div>
    </app-page-layout>
  `,
  styles: [`
    .wizard-container {
      padding: 0;
      max-width: 1600px;
      margin: 0 auto;
    }

    .wizard-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;

      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
      }
    }

    // Progress Sidebar
    .progress-sidebar {
      position: sticky;
      top: 24px;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      @media (max-width: 1200px) {
        position: static;
      }
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 20px 0;
    }

    .progress-steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .progress-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      transition: all 0.3s ease;

      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;

        .step-indicator {
          background: white;
          color: #667eea;
        }

        .step-label,
        .step-description {
          color: white;
        }
      }

      &.completed {
        background: #f0fdf4;

        .step-indicator {
          background: #10b981;
          color: white;
        }
      }
    }

    .step-indicator {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      color: #6b7280;
      font-weight: 600;
      flex-shrink: 0;
      transition: all 0.3s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .step-info {
      flex: 1;
    }

    .step-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }

    .step-description {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }

    .campaign-summary {
      h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 12px 0;
      }
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      font-size: 13px;
      color: #4b5563;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #9ca3af;
      }
    }

    // Wizard Content
    .wizard-content {
      min-height: 600px;
    }

    .wizard-card {
      padding: 0;
      overflow: visible;

      ::ng-deep {
        .mat-stepper-horizontal {
          background: transparent;
        }

        .mat-horizontal-stepper-header-container {
          padding: 24px 32px;
          background: white;
          border-radius: 12px 12px 0 0;
          border-bottom: 2px solid #e5e7eb;
        }

        .mat-horizontal-content-container {
          padding: 0;
        }

        .mat-step-header {
          &.cdk-keyboard-focused,
          &.cdk-program-focused,
          &:hover:not([aria-disabled]),
          &:hover[aria-disabled=false] {
            background: transparent;
          }
        }
      }
    }

    .step-container {
      padding: 32px;
      min-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .step-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 32px;

      .step-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--primary-color);
      }

      h2 {
        font-size: 28px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 16px;
        color: #6b7280;
        margin: 0;
      }
    }

    .step-form {
      flex: 1;
      margin-bottom: 32px;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;

      button {
        min-width: 140px;

        mat-icon {
          margin: 0 4px;
        }
      }
    }

    // Channel Selection
    .channel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .channel-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #e5e7eb;

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--primary-color);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .mat-mdc-radio-button {
        width: 100%;
      }
    }

    .channel-content {
      padding: 24px;
      text-align: center;

      .channel-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--primary-color);
        margin-bottom: 16px;
      }

      h3 {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 16px 0;
      }
    }

    .channel-features {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .feature-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #f3f4f6;
      color: #4b5563;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    // Template Selection
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .template-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #e5e7eb;

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--primary-color);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: #f3f4f6;
      color: #6b7280;

      &.active {
        background: #d1fae5;
        color: #065f46;
      }
    }

    .template-content {
      font-size: 14px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 12px;
      max-height: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-variables {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .variable-chip {
      display: inline-block;
      padding: 3px 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }

    .template-stats {
      display: flex;
      gap: 16px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;

      span {
        display: flex;
        align-items: center;
        gap: 4px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    // Audience/Segment Selection
    .segments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .segment-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #e5e7eb;

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--primary-color);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .mat-mdc-radio-button {
        width: 100%;
      }
    }

    .segment-content {
      padding: 20px;

      .segment-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--primary-color);
        margin-bottom: 12px;
      }

      h4 {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 16px 0;
      }
    }

    .segment-count {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--primary-color);
      }
    }

    // Schedule
    .schedule-type-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .schedule-type-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #e5e7eb;

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--primary-color);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .mat-mdc-radio-button {
        width: 100%;
      }
    }

    .schedule-type-content {
      padding: 20px;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--primary-color);
        margin-bottom: 12px;
      }

      h4 {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
    }

    .schedule-details {
      padding: 24px;
      background: #f9fafb;
      border-radius: 8px;
      margin-top: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    // Final Summary
    .final-summary {
      h3 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 24px 0;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: var(--primary-color);
        }
      }
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--primary-color);
        flex-shrink: 0;
      }

      > div {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
    }

    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }

    // States
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #9ca3af;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 24px 0;
      }
    }

    // Utilities
    .full-width {
      width: 100%;
    }
  `]
})
export class CampaignWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly campaignService = inject(CampaignService);
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly emailTemplateService = inject(EmailTemplateService);
  private readonly whatsappTemplateService = inject(WhatsAppTemplateService);
  private readonly telegramTemplateService = inject(TelegramTemplateService);
  private readonly segmentService = inject(SegmentService);
  private readonly snackBar = inject(MatSnackBar);

  currentStep = signal(0);
  loading = signal(false);
  loadingTemplates = signal(false);
  loadingSegments = signal(false);
  minDate = new Date();
  
  // Signal для отслеживания выбранного канала
  selectedChannel = signal<string>('SMS');

  basicInfoForm: FormGroup;
  channelForm: FormGroup;
  contentForm: FormGroup;
  audienceForm: FormGroup;
  scheduleForm: FormGroup;

  // Computed property для получения текущих шаблонов в зависимости от выбранного канала
  availableTemplates = computed(() => {
    const channel = this.selectedChannel();
    switch (channel) {
      case 'SMS':
        return this.smsTemplateService.templates();
      case 'EMAIL':
        return this.emailTemplateService.templates();
      case 'WHATSAPP':
        return this.whatsappTemplateService.templates();
      case 'TELEGRAM':
        return this.telegramTemplateService.templates();
      default:
        return [];
    }
  });

  // Computed property для получения доступных сегментов
  availableSegments = computed(() => {
    return this.segmentService.segments();
  });

  steps = [
    { index: 0, label: 'Основная информация', description: 'Название и описание' },
    { index: 1, label: 'Канал отправки', description: 'SMS, Email или Multi' },
    { index: 2, label: 'Шаблон сообщения', description: 'Выбор контента' },
    { index: 3, label: 'Целевая аудитория', description: 'Кто получит сообщения' },
    { index: 4, label: 'Планирование', description: 'Когда отправить' }
  ];

  estimatedCost = computed(() => {
    const count = this.getRecipientCountNumber(this.audienceForm?.get('segmentId')?.value);
    return (count * 1.5).toFixed(2);
  });

  estimatedDuration = computed(() => {
    const count = this.getRecipientCountNumber(this.audienceForm?.get('segmentId')?.value);
    const minutes = Math.ceil(count / 100);
    if (minutes < 60) return `~${minutes} мин`;
    return `~${Math.floor(minutes / 60)}ч ${minutes % 60}мин`;
  });

  constructor() {
    this.basicInfoForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    this.channelForm = this.fb.group({
      channel: ['SMS', Validators.required]
    });

    this.contentForm = this.fb.group({
      templateId: ['', Validators.required]
    });

    this.audienceForm = this.fb.group({
      segmentId: ['all', Validators.required]
    });

    this.scheduleForm = this.fb.group({
      scheduleType: ['immediate', Validators.required],
      scheduledDate: [null],
      scheduledTime: ['']
    });

    // Load templates and segments
    this.loadTemplates();
    this.loadSegments();
  }

  loadTemplates() {
    this.loadingTemplates.set(true);
    this.smsTemplateService.getAll().subscribe({
      next: () => this.loadingTemplates.set(false),
      error: () => {
        this.loadingTemplates.set(false);
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  loadSegments() {
    this.loadingSegments.set(true);
    this.segmentService.getAll(1, 100, true).subscribe({
      next: () => this.loadingSegments.set(false),
      error: () => {
        this.loadingSegments.set(false);
        this.snackBar.open('Ошибка загрузки сегментов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  onStepChange(event: any) {
    this.currentStep.set(event.selectedIndex);
  }

  selectTemplate(template: any) {
    this.contentForm.patchValue({ templateId: template.id });
  }

  selectChannel(channel: string) {
    this.channelForm.patchValue({ channel });
    this.selectedChannel.set(channel); // Обновляем signal для реактивности
    
    // Сбрасываем выбранный шаблон при смене канала
    this.contentForm.patchValue({ templateId: null });
    
    // Загрузить шаблоны для выбранного канала
    this.loadingTemplates.set(true);
    switch (channel) {
      case 'SMS':
        this.smsTemplateService.getAll().subscribe(() => this.loadingTemplates.set(false));
        break;
      case 'EMAIL':
        this.emailTemplateService.getAll().subscribe(() => this.loadingTemplates.set(false));
        break;
      case 'WHATSAPP':
        this.whatsappTemplateService.getAll().subscribe(() => this.loadingTemplates.set(false));
        break;
      case 'TELEGRAM':
        this.telegramTemplateService.getAll().subscribe(() => this.loadingTemplates.set(false));
        break;
      default:
        this.loadingTemplates.set(false);
    }
  }

  selectSegment(segmentId: string) {
    this.audienceForm.patchValue({ segmentId });
  }

  selectScheduleType(scheduleType: string) {
    this.scheduleForm.patchValue({ scheduleType });
  }

  createNewTemplate() {
    this.router.navigate(['/messages/sms-templates/new']);
  }

  getChannelLabel(channel: string): string {
    const labels: Record<string, string> = {
      'SMS': 'SMS',
      'EMAIL': 'Email',
      'WHATSAPP': 'WhatsApp',
      'TELEGRAM': 'Telegram',
      'MULTI': 'Мультиканальная'
    };
    return labels[channel] || 'Не выбрано';
  }

  getSegmentLabel(segmentId: string | null): string {
    if (!segmentId) {
      return 'Все контакты';
    }
    const segment = this.availableSegments().find(s => s.id === segmentId);
    return segment?.name || 'Не выбрано';
  }

  getTemplateName(templateId: string): string {
    const template = this.availableTemplates().find(t => t.id === templateId);
    return template?.name || 'Не выбрано';
  }

  getTemplatePreview(template: any): string {
    // Универсальный метод для получения превью любого типа шаблона
    if (template.content) return template.content;
    if (template.subject) return template.subject;
    if (template.message) return template.message;
    if (template.text) return template.text;
    return 'Нет контента';
  }

  getRecipientCount(segmentId: string | null): string {
    return this.getRecipientCountNumber(segmentId).toLocaleString('ru-RU');
  }

  getRecipientCountNumber(segmentId: string | null): number {
    if (!segmentId) {
      // For "All contacts" - sum all segment contacts or return total from service
      // For now, return sum of all segment contactCounts
      const segments = this.availableSegments();
      if (segments.length === 0) return 0;
      return segments.reduce((sum, segment) => sum + (segment.contactsCount || 0), 0);
    }
    const segment = this.availableSegments().find(s => s.id === segmentId);
    return segment?.contactsCount || 0;
  }

  createCampaign() {
    if (!this.basicInfoForm.valid || !this.channelForm.valid || 
        !this.contentForm.valid || !this.audienceForm.valid || 
        !this.scheduleForm.valid) {
      this.snackBar.open('Заполните все обязательные поля', 'Закрыть', { duration: 3000 });
      return;
    }

    let scheduledDateTime = null;
    if (this.scheduleForm.value.scheduleType === 'scheduled' && 
        this.scheduleForm.value.scheduledDate && 
        this.scheduleForm.value.scheduledTime) {
      const date = new Date(this.scheduleForm.value.scheduledDate);
      const [hours, minutes] = this.scheduleForm.value.scheduledTime.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      scheduledDateTime = date;
    }

    const dto: CreateCampaignDto = {
      name: this.basicInfoForm.value.name,
      description: this.basicInfoForm.value.description,
      type: this.scheduleForm.value.scheduleType === 'immediate' ? CampaignType.IMMEDIATE : CampaignType.SCHEDULED,
      channel: this.selectedChannel().toLowerCase() as any, // Приводим к lowercase для backend
      templateId: this.contentForm.value.templateId,
      segmentId: this.audienceForm.value.segmentId,
      scheduledAt: scheduledDateTime
    };

    this.loading.set(true);

    this.campaignService.create(dto).subscribe({
      next: () => {
        this.snackBar.open('Кампания успешно создана!', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/notifications/campaigns']);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка создания кампании',
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
