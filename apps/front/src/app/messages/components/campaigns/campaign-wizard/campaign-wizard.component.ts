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
  templateUrl: './campaign-wizard.component.html',
  styleUrls: ['./campaign-wizard.component.scss']
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
  
  selectedChannel = signal<string>('SMS');

  basicInfoForm: FormGroup;
  channelForm: FormGroup;
  contentForm: FormGroup;
  audienceForm: FormGroup;
  scheduleForm: FormGroup;

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
      segmentId: ['all']
    });

    this.scheduleForm = this.fb.group({
      scheduleType: ['immediate', Validators.required],
      scheduledDate: [null],
      scheduledTime: ['']
    });

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
    this.selectedChannel.set(channel);
    this.contentForm.patchValue({ templateId: null });
    
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
    if (!segmentId || segmentId === 'all') {
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
    if (!segmentId || segmentId === 'all') {
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
      channel: this.selectedChannel().toLowerCase() as any,
      templateId: this.contentForm.value.templateId,
      segmentId: this.audienceForm.value.segmentId,
      scheduledAt: scheduledDateTime
    };

    this.loading.set(true);

    this.campaignService.create(dto).subscribe({
      next: () => {
        this.snackBar.open('Кампания успешно создана!', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/messages/campaigns']);
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
    this.router.navigate(['/messages/campaigns']);
  }
}
