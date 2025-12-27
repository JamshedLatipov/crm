import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-campaign-wizard',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="wizard-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Мастер создания кампании</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper [linear]="true" #stepper>
            <mat-step label="Основная информация">
              <div class="step-content">
                <h3>Шаг 1: Основная информация</h3>
                <p>Настройте название и параметры кампании</p>
                <div class="actions">
                  <button mat-button matStepperNext>Далее</button>
                </div>
              </div>
            </mat-step>

            <mat-step label="Выбор канала">
              <div class="step-content">
                <h3>Шаг 2: Выбор канала</h3>
                <p>Выберите канал отправки (SMS, Email, Мульти)</p>
                <div class="actions">
                  <button mat-button matStepperPrevious>Назад</button>
                  <button mat-button matStepperNext>Далее</button>
                </div>
              </div>
            </mat-step>

            <mat-step label="Выбор сегмента">
              <div class="step-content">
                <h3>Шаг 3: Выбор сегмента</h3>
                <p>Выберите сегмент получателей</p>
                <div class="actions">
                  <button mat-button matStepperPrevious>Назад</button>
                  <button mat-button matStepperNext>Далее</button>
                </div>
              </div>
            </mat-step>

            <mat-step label="Контент">
              <div class="step-content">
                <h3>Шаг 4: Настройка контента</h3>
                <p>Выберите шаблон и настройте содержимое</p>
                <div class="actions">
                  <button mat-button matStepperPrevious>Назад</button>
                  <button mat-button matStepperNext>Далее</button>
                </div>
              </div>
            </mat-step>

            <mat-step label="Подтверждение">
              <div class="step-content">
                <h3>Шаг 5: Подтверждение</h3>
                <p>Проверьте настройки и запустите кампанию</p>
                <div class="actions">
                  <button mat-button matStepperPrevious>Назад</button>
                  <button mat-raised-button color="primary">Запустить</button>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .wizard-container {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .step-content {
      padding: 24px 0;
    }

    .actions {
      margin-top: 24px;
      display: flex;
      gap: 8px;
    }
  `]
})
export class CampaignWizardComponent {
  currentStep = signal(0);
}
