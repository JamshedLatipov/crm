import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-notifications-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="dashboard-container p-6">
      <h1 class="text-3xl font-bold mb-6">Центр уведомлений</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- SMS Card -->
        <mat-card class="stat-card">
          <mat-card-content class="flex items-center">
            <mat-icon class="text-cyan-500 text-5xl mr-4">sms</mat-icon>
            <div>
              <h3 class="text-lg text-gray-600">SMS</h3>
              <p class="text-3xl font-bold">Скоро</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Email Card -->
        <mat-card class="stat-card">
          <mat-card-content class="flex items-center">
            <mat-icon class="text-orange-500 text-5xl mr-4">email</mat-icon>
            <div>
              <h3 class="text-lg text-gray-600">Email</h3>
              <p class="text-3xl font-bold">Скоро</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Webhook Card -->
        <mat-card class="stat-card">
          <mat-card-content class="flex items-center">
            <mat-icon class="text-purple-500 text-5xl mr-4">webhook</mat-icon>
            <div>
              <h3 class="text-lg text-gray-600">Webhooks</h3>
              <p class="text-3xl font-bold">Скоро</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Модуль в разработке</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="mb-4">Центр уведомлений находится в разработке. Здесь будет доступно:</p>
          <ul class="list-disc list-inside space-y-2">
            <li>📱 SMS рассылки через SMS.RU, SMSC.RU, Twilio</li>
            <li>📧 Email рассылки через SMTP</li>
            <li>🔗 REST API/Webhooks для интеграций</li>
            <li>📊 Многоканальные кампании</li>
            <li>👥 Сегментация контактов</li>
            <li>📈 Аналитика и отчеты</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .stat-card {
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
  `],
})
export class DashboardComponent {}
