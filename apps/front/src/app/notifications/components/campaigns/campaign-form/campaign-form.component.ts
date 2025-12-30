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
  templateUrl: './campaign-form.component.html',
  styleUrl: './campaign-form.component.scss'
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
