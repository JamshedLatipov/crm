import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface DemoCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  features: string[];
}

@Component({
  selector: 'demo-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  demoCards: DemoCard[] = [
    {
      title: 'Табло очереди',
      description: 'Отображение реальной очереди в реальном времени через WebSocket',
      icon: '📺',
      route: '/display',
      color: '#667eea',
      features: [
        'WebSocket real-time обновления',
        'Фильтрация по зонам',
        'Цветовое кодирование статусов',
        'Автоматическая сортировка',
      ],
    },
    {
      title: 'Отслеживание заказа',
      description: 'Публичная страница для отслеживания статуса заказа по номеру телефона',
      icon: '🔍',
      route: '/track/test-001',
      color: '#f093fb',
      features: [
        'Верификация по телефону',
        'Позиция в очереди',
        'Расчет времени ожидания',
        'Отмена заказа (только WAITING)',
      ],
    },
    {
      title: 'Терминал механика',
      description: 'Рабочее место механика с авторизацией по PIN-коду',
      icon: '🔧',
      route: '/mechanic',
      color: '#4facfe',
      features: [
        'PIN-авторизация (1234, 5678, 9999)',
        'Таймеры выполнения',
        'Взятие заказов в работу',
        'Блокировка проблемных заказов',
      ],
    },
    {
      title: 'Форма записи через QR',
      description: 'Публичная форма для записи в очередь по QR-коду',
      icon: '📱',
      route: '/join',
      color: '#43e97b',
      features: [
        'QR-токен из URL параметров',
        'Валидация формы',
        'Rate limiting (30 мин)',
        'Экран успешной записи',
      ],
    },
  ];

  techStack = [
    { name: 'Angular 20', icon: '🅰️' },
    { name: 'TypeScript 5.8', icon: '📘' },
    { name: 'Socket.IO', icon: '🔌' },
    { name: 'RxJS 7', icon: '🌊' },
    { name: 'Signals', icon: '📡' },
    { name: 'Standalone', icon: '🎯' },
  ];

  apiEndpoints = [
    { method: 'GET', path: '/api/public/queue/info', description: 'Информация о зоне обслуживания' },
    { method: 'POST', path: '/api/public/queue/join', description: 'Запись в очередь' },
    { method: 'GET', path: '/api/public/queue/status/:id', description: 'Статус заказа' },
    { method: 'POST', path: '/api/public/queue/cancel/:id', description: 'Отмена заказа' },
    { method: 'GET', path: '/api/orders', description: 'Список заказов (admin)' },
    { method: 'PATCH', path: '/api/orders/:id/status', description: 'Обновление статуса (admin)' },
  ];
}
