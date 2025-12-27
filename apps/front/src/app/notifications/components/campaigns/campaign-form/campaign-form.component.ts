import { Component, OnInit, signal } from '@angular/core';
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
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';

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
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      [title]="campaignId() ? 'Редактировать кампанию' : 'Новая кампания'"
      [subtitle]="campaignId() ? 'Изменение настроек кампании' : 'Создание новой кампании уведомлений'"
    >
      <div page-actions>
        <button mat-stroked-button (click)="cancel()">
          <mat-icon>close</mat-icon>
          Отмена
        </button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
          <mat-icon>save</mat-icon>
          Сохранить
        </button>
      </div>

      <div class="form-container">
        <mat-card class="form-card">
          <form [formGroup]="form">
            <!-- Basic Info Section -->
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>info</mat-icon>
                Основная информация
              </h3>
              
              <div class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Название кампании</mat-label>
                  <input matInput formControlName="name" placeholder="Введите название">
                  <mat-icon matPrefix>campaign</mat-icon>
                  @if (form.get('name')?.hasError('required')) {
                    <mat-error>Название обязательно</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Канал</mat-label>
                  <mat-select formControlName="channel">
                    <mat-option value="sms">
                      <mat-icon>sms</mat-icon> SMS
                    </mat-option>
                    <mat-option value="email">
                      <mat-icon>email</mat-icon> Email
                    </mat-option>
                    <mat-option value="multi">
                      <mat-icon>layers</mat-icon> Мультиканальная
                    </mat-option>
                  </mat-select>
                  <mat-icon matPrefix>send</mat-icon>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Описание</mat-label>
                <textarea matInput formControlName="description" rows="4" placeholder="Опишите цель кампании"></textarea>
                <mat-icon matPrefix>description</mat-icon>
              </mat-form-field>
            </div>

            <!-- Schedule Section -->
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>schedule</mat-icon>
                Планирование
              </h3>
              
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Дата и время отправки</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="scheduledAt">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                <mat-icon matPrefix>event</mat-icon>
                <mat-hint>Оставьте пустым для немедленной отправки</mat-hint>
              </mat-form-field>
            </div>
          </form>
        </mat-card>
      </div>
    </app-page-layout>
  `,
  styles: [`
    .form-container {
      max-width: 900px;
      margin: 0 auto;
    }

    .form-card {
      padding: 32px;
    }

    .form-section {
      margin-bottom: 40px;
      
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
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 16px;
    }
  `]
})
export class CampaignFormComponent implements OnInit {
  form!: FormGroup;
  campaignId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.campaignId.set(id);
    
    if (id && id !== 'new') {
      // TODO: Загрузить данные кампании
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      channel: ['sms', Validators.required],
      description: [''],
      scheduledAt: [null]
    });
  }

  save() {
    if (this.form.valid) {
      // TODO: Сохранить через сервис
      console.log('Saving campaign:', this.form.value);
      this.router.navigate(['/notifications/campaigns']);
    }
  }

  cancel() {
    this.router.navigate(['/notifications/campaigns']);
  }
}
