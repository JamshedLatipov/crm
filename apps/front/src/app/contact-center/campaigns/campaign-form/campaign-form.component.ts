import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CampaignApiService } from '../../services/campaign-api.service';
import { QueuesService, QueueRecord } from '../../services/queues.service';
import { CampaignType, CreateCampaignDto } from '../../models/campaign.models';
import { AudioFileSelectorComponent } from '../components/audio-file-selector/audio-file-selector.component';

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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    PageLayoutComponent,
  ],
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.scss'],
})
export class CampaignFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly campaignApi = inject(CampaignApiService);
  private readonly queuesService = inject(QueuesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  form!: FormGroup;
  loading = signal(false);
  isEditMode = signal(false);
  campaignId = signal<string | null>(null);
  selectedAudioFile = signal<string>('');
  queues = signal<QueueRecord[]>([]);

  readonly CampaignType = CampaignType;
  readonly campaignTypes = [
    { value: CampaignType.IVR, label: 'IVR - Проигрывание аудио' },
    { value: CampaignType.AGENT, label: 'Оператор - Переброс в очередь' },
    { value: CampaignType.HYBRID, label: 'Гибрид - IVR + Оператор' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadQueues();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.campaignId.set(id);
      this.loadCampaign(id);
    }
  }

  loadQueues(): void {
    this.queuesService.list().subscribe({
      next: (queues) => {
        this.queues.set(queues);
      },
      error: (err) => {
        console.error('Error loading queues:', err);
        this.snackBar.open('Ошибка загрузки очередей', 'ОК', { duration: 3000 });
      },
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: [CampaignType.IVR, Validators.required],
      audioFilePath: [''],
      queueId: [''],
      settings: this.fb.group({
        maxAttempts: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
        retryInterval: [15, [Validators.required, Validators.min(5), Validators.max(1440)]],
        maxCallDuration: [300, [Validators.required, Validators.min(30), Validators.max(3600)]],
        simultaneousCalls: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
        callerIdNumber: [''],
        callerIdName: [''],
      }),
    });
  }

  loadCampaign(id: string): void {
    this.loading.set(true);
    this.campaignApi.getCampaign(id).subscribe({
      next: (campaign) => {
        this.form.patchValue({
          name: campaign.name,
          description: campaign.description,
          type: campaign.type,
          audioFilePath: campaign.audioFilePath,
          queueId: campaign.queueId,
          settings: campaign.settings,
        });
        
        // Extract filename from path if exists
        if (campaign.audioFilePath) {
          const filename = campaign.audioFilePath.split('/').pop() || '';
          this.selectedAudioFile.set(filename);
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading campaign:', err);
        this.snackBar.open('Ошибка загрузки кампании', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.form.value;
    
    const dto: CreateCampaignDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      type: formValue.type,
      audioFilePath: formValue.audioFilePath || undefined,
      queueId: formValue.queueId || undefined,
      settings: formValue.settings,
    };

    if (this.isEditMode()) {
      this.updateCampaign(dto);
    } else {
      this.createCampaign(dto);
    }
  }

  createCampaign(dto: CreateCampaignDto): void {
    this.campaignApi.createCampaign(dto).subscribe({
      next: () => {
        this.snackBar.open('Кампания создана', 'ОК', { duration: 3000 });
        this.router.navigate(['/contact-center/campaigns']);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error creating campaign:', err);
        this.snackBar.open('Ошибка создания кампании', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  updateCampaign(dto: CreateCampaignDto): void {
    const id = this.campaignId();
    if (!id) return;

    this.campaignApi.updateCampaign(id, dto).subscribe({
      next: () => {
        this.snackBar.open('Кампания обновлена', 'ОК', { duration: 3000 });
        this.router.navigate(['/contact-center/campaigns']);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error updating campaign:', err);
        this.snackBar.open('Ошибка обновления кампании', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/contact-center/campaigns']);
  }

  openAudioFileSelector(): void {
    const dialogRef = this.dialog.open(AudioFileSelectorComponent, {
      minWidth: '800px',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.selectedAudioFile.set(result.name);
        this.form.patchValue({ audioFilePath: result.filename });
      }
    });
  }

  isIvrOrHybrid(): boolean {
    const type = this.form.get('type')?.value;
    return type === CampaignType.IVR || type === CampaignType.HYBRID;
  }

  isAgentOrHybrid(): boolean {
    const type = this.form.get('type')?.value;
    return type === CampaignType.AGENT || type === CampaignType.HYBRID;
  }
}
