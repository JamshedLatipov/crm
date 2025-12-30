import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    PageLayoutComponent
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  selectedPeriod = 'week';
  
  stats = signal({
    total: 12450,
    delivered: 11980,
    failed: 470,
    deliveryRate: 96.2
  });

  channelStats = signal([
    {
      name: 'SMS',
      sent: 5400,
      delivered: 5280,
      failed: 120,
      deliveryRate: 97.8
    },
    {
      name: 'Email',
      sent: 6200,
      delivered: 5900,
      failed: 300,
      deliveryRate: 95.2
    },
    {
      name: 'Webhook',
      sent: 850,
      delivered: 800,
      failed: 50,
      deliveryRate: 94.1
    }
  ]);

  topCampaigns = signal([
    { id: '1', name: 'Новогодняя акция', sent: 3200, deliveryRate: 98.1 },
    { id: '2', name: 'Приветствие новых клиентов', sent: 2850, deliveryRate: 97.5 },
    { id: '3', name: 'Напоминание о встрече', sent: 2100, deliveryRate: 96.8 },
    { id: '4', name: 'Еженедельная рассылка', sent: 1950, deliveryRate: 95.2 },
    { id: '5', name: 'Статус заказа', sent: 1500, deliveryRate: 99.0 }
  ]);

  ngOnInit() {
    // TODO: Загрузить данные через сервис
  }
}
