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
    MatNativeDateModule
  ],
  template: `
    <div class="campaign-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            {{ campaignId() ? 'Редактировать кампанию' : 'Новая кампания' }}
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Название кампании</mat-label>
              <input matInput formControlName="name" placeholder="Введите название">
              @if (form.get('name')?.hasError('required')) {
                <mat-error>Название обязательно</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Канал</mat-label>
              <mat-select formControlName="channel">
                <mat-option value="sms">SMS</mat-option>
                <mat-option value="email">Email</mat-option>
                <mat-option value="multi">Мультиканальная</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Описание</mat-label>
              <textarea matInput formControlName="description" rows="4"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Дата отправки</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="scheduledAt">
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-hint>Оставьте пустым для немедленной отправки</mat-hint>
            </mat-form-field>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Отмена</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
            Сохранить
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .campaign-form-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
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
