import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Lead } from '../../models/lead.model';
import { LeadService } from '../../services/lead.service';
import { PipelineService } from '../../../pipeline/pipeline.service';
import { Stage, StageType } from '../../../pipeline/dtos';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CurrencySymbolPipe } from '../../../shared/pipes/currency-symbol.pipe';
import { CurrencyService } from '../../../services/currency.service';

@Component({
  selector: 'app-convert-to-deal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatIconModule,
    CurrencyFormatPipe,
    CurrencySymbolPipe,
  ],
  template: `
    <div class="convert-deal-dialog">
      <h2 mat-dialog-title>Конвертировать лид в сделку</h2>
      
      <mat-dialog-content>
        <div class="lead-info-card">
          <div class="lead-info-header">
            <div class="header-icon">
              <mat-icon class="lead-icon">person_outline</mat-icon>
            </div>
            <div class="header-content">
              <h3 class="lead-title">{{ data.lead.name }}</h3>
              <p class="lead-subtitle">Информация о лиде</p>
            </div>
            <div class="lead-status">
              <span class="status-badge">Лид</span>
            </div>
          </div>
          
          <div class="lead-info-grid">
            <div class="info-item">
              <div class="info-icon">
                <mat-icon>email</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Email</div>
                <div class="info-value">{{ data.lead.email || 'Не указан' }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <mat-icon>phone</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Телефон</div>
                <div class="info-value">{{ data.lead.phone || 'Не указан' }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <mat-icon>business</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Компания</div>
                <div class="info-value">{{ data.lead.company?.name || data.lead.company?.legalName || 'Не указана' }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <mat-icon>attach_money</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Оценочная стоимость</div>
                <div class="info-value">{{ data.lead.estimatedValue ? (data.lead.estimatedValue | currencyFormat) : 'Не указана' }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Вероятность конверсии</div>
                <div class="info-value">{{ data.lead.conversionProbability }}%</div>
              </div>
            </div>
            
            <div class="info-item" *ngIf="data.lead.position">
              <div class="info-icon">
                <mat-icon>work</mat-icon>
              </div>
              <div class="info-content">
                <div class="info-label">Должность</div>
                <div class="info-value">{{ data.lead.position }}</div>
              </div>
            </div>
          </div>
        </div>

        <form [formGroup]="convertForm" class="space-y-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Название сделки</mat-label>
            <input matInput formControlName="title" placeholder="Введите название сделки">
          </mat-form-field>

          <div class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Сумма сделки</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="0">
              <span matSuffix>{{ '' | currencySymbol }}</span>
              <mat-error *ngIf="convertForm.get('amount')?.hasError('required')">
                Сумма обязательна
              </mat-error>
              <mat-error *ngIf="convertForm.get('amount')?.hasError('min')">
                Сумма должна быть больше 0
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Валюта</mat-label>
              <mat-select formControlName="currency">
                <mat-option value="TJS">TJS (Таджикский сомони)</mat-option>
                <mat-option value="USD">USD (Доллар США)</mat-option>
                <mat-option value="EUR">EUR (Евро)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="probability-field">
            <div class="probability-header">
              <mat-icon class="probability-icon">trending_up</mat-icon>
              <div class="probability-label">Вероятность закрытия</div>
              <div class="probability-value">
                {{ probabilityControl.value || 0 }}%
              </div>
            </div>
            <mat-slider
              min="0"
              max="100"
              step="5"
              discrete
              class="probability-slider"
            >
              <input matSliderThumb [formControl]="probabilityControl" />
            </mat-slider>
            <div class="probability-scale">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Этап воронки</mat-label>
              <mat-select formControlName="stageId">
                <mat-option *ngFor="let stage of dealStages" [value]="stage.id">
                  {{ stage.name }} ({{ stage.probability }}%)
                </mat-option>
              </mat-select>
              <mat-error *ngIf="convertForm.get('stageId')?.hasError('required')">
                Этап обязателен
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Ожидаемая дата закрытия</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="expectedCloseDate">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="convertForm.get('expectedCloseDate')?.hasError('required')">
              Дата закрытия обязательна
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Заметки</mat-label>
            <textarea matInput formControlName="notes" rows="3" 
                      placeholder="Дополнительная информация о сделке..."></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="gap-2 p-4">
        <button mat-button (click)="onCancel()" [disabled]="isLoading">
          Отмена
        </button>
        <button mat-raised-button color="primary" 
                (click)="onConvert()" 
                [disabled]="convertForm.invalid || isLoading">
          <mat-spinner *ngIf="isLoading" diameter="20" class="mr-2"></mat-spinner>
          Конвертировать в сделку
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .convert-deal-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    // Новые стили для карточки информации о лиде
    .lead-info-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 1px solid #dee2e6;
      border-radius: 12px;
      padding: 0;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .lead-info-header {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      color: white;
      gap: 1rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      backdrop-filter: blur(10px);
    }

    .lead-icon {
      font-size: 24px;
      color: white;
    }

    .header-content {
      flex: 1;
    }

    .lead-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .lead-subtitle {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .lead-status {
      display: flex;
      align-items: center;
    }

    .status-badge {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .lead-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0;
      padding: 1.5rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .info-item:hover {
      background: rgba(33, 150, 243, 0.05);
      transform: translateY(-1px);
    }

    .info-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 8px;
      color: #1976d2;
      flex-shrink: 0;
    }

    .info-icon mat-icon {
      font-size: 18px;
    }

    .info-content {
      flex: 1;
      min-width: 0;
    }

    .info-label {
      font-size: 0.75rem;
      color: #666;
      font-weight: 500;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 0.875rem;
      color: #333;
      font-weight: 500;
      word-wrap: break-word;
    }

    .lead-info {
      border-left: 4px solid #2196f3;
    }

    mat-form-field {
      width: 100%;
    }

    .grid {
      display: grid;
    }

    .grid-cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .gap-4 {
      gap: 1rem;
    }

    .space-y-4 > * + * {
      margin-top: 1rem;
    }

    .mb-2 {
      margin-bottom: 0.5rem;
    }

    .mb-4 {
      margin-bottom: 1rem;
    }

    .p-4 {
      padding: 1rem;
    }

    .bg-gray-50 {
      background-color: #f9fafb;
    }

    .rounded-lg {
      border-radius: 0.5rem;
    }

    .text-lg {
      font-size: 1.125rem;
    }

    .text-sm {
      font-size: 0.875rem;
    }

    .font-semibold {
      font-weight: 600;
    }

    .w-full {
      width: 100%;
    }

    .mr-2 {
      margin-right: 0.5rem;
    }

    // Стили для слайдера вероятности
    .probability-field {
      margin: 1.5rem 0;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    .probability-header {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      gap: 8px;
    }

    .probability-icon {
      color: #2196f3;
    }

    .probability-label {
      flex: 1;
      font-weight: 500;
      color: #333;
    }

    .probability-value {
      font-weight: 600;
      color: #2196f3;
      font-size: 1.1rem;
    }

    .probability-slider {
      width: 100%;
      margin: 0.5rem 0;
    }

    .probability-scale {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.5rem;
    }

    .grid-cols-1 {
      grid-template-columns: 1fr;
    }

    // Адаптивность для мобильных устройств
    @media (max-width: 768px) {
      .convert-deal-dialog {
        min-width: 100%;
        max-width: 100%;
      }

      .lead-info-header {
        padding: 1rem;
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
      }

      .lead-info-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
      }

      .info-item {
        padding: 0.5rem;
      }

      .header-icon {
        width: 40px;
        height: 40px;
      }

      .lead-icon {
        font-size: 20px;
      }
    }

    @media (max-width: 480px) {
      .lead-info-header {
        padding: 0.75rem;
      }

      .lead-title {
        font-size: 1.1rem;
      }

      .lead-subtitle {
        font-size: 0.8rem;
      }
    }
  `]
})
export class ConvertToDealDialogComponent implements OnInit {
  convertForm: FormGroup;
  probabilityControl: FormControl;
  dealStages: Stage[] = [];
  isLoading = false;

  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly pipelineService = inject(PipelineService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<ConvertToDealDialogComponent>);
  private readonly currencyService = inject(CurrencyService);
  public readonly data = inject(MAT_DIALOG_DATA) as { lead: Lead };

  constructor() {
    // Создаем отдельный FormControl для слайдера
    this.probabilityControl = new FormControl(this.data.lead.conversionProbability || 50, [Validators.min(0), Validators.max(100)]);
    
    this.convertForm = this.fb.group({
      title: [`Сделка от ${this.data.lead.name}`, [Validators.required]],
      amount: [this.data.lead.estimatedValue || 0, [Validators.required, Validators.min(1)]],
      currency: [this.currencyService.currencyCode()],
      probability: [this.probabilityControl.value, [Validators.min(0), Validators.max(100)]],
      stageId: ['', [Validators.required]],
      expectedCloseDate: [this.getDefaultCloseDate(), [Validators.required]],
      notes: [`Конвертировано из лида #${this.data.lead.id}: ${this.data.lead.name}`]
    });

    // Синхронизируем значения между слайдером и формой
    this.probabilityControl.valueChanges.subscribe(value => {
      this.convertForm.patchValue({ probability: value }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadDealStages();
  }

  private getDefaultCloseDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // По умолчанию через месяц
    return date;
  }

  private loadDealStages(): void {
    this.pipelineService.listStages(StageType.DEAL_PROGRESSION).subscribe({
      next: (stages) => {
        this.dealStages = stages || [];
        // Выбираем первый этап по умолчанию
        if (this.dealStages.length > 0) {
          this.convertForm.patchValue({ stageId: this.dealStages[0].id });
        }
      },
      error: (error) => {
        console.error('Error loading deal stages:', error);
        this.snackBar.open('Ошибка загрузки этапов сделок', 'Закрыть', { duration: 3000 });
      }
    });
  }

  onConvert(): void {
    if (this.convertForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.convertForm.value;
    
    this.leadService.convertToDeal(this.data.lead.id.toString(), {
      title: formValue.title,
      amount: formValue.amount,
      currency: formValue.currency,
      probability: formValue.probability,
      expectedCloseDate: formValue.expectedCloseDate,
      stageId: formValue.stageId,
      notes: formValue.notes
    }).subscribe({
      next: (deal) => {
        this.isLoading = false;
        this.snackBar.open('Лид успешно конвертирован в сделку!', 'Закрыть', { 
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(deal);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error converting lead to deal:', error);
        this.snackBar.open('Ошибка при конвертации лида в сделку', 'Закрыть', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.convertForm.controls).forEach(key => {
      const control = this.convertForm.get(key);
      control?.markAsTouched();
    });
  }
}