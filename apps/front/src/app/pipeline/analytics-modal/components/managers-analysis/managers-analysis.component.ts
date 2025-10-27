import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { StageAnalytics } from '../../../dtos';

interface ManagerStats {
  managerId: string;
  managerName: string;
  dealsCount: number;
  totalAmount: number;
  averageAmount: number;
  conversionRate: number;
  wonDeals: number;
  lostDeals: number;
  activeDeals: number;
  averageCycleTime: number;
}

@Component({
  selector: 'app-managers-analysis',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  templateUrl: './managers-analysis.component.html',
  styleUrls: ['./managers-analysis.component.scss']
})
export class ManagersAnalysisComponent {
  @Input() stages: StageAnalytics[] | null = null;

  displayedColumns = ['manager', 'deals', 'amount', 'conversion', 'performance'];

  // Демо-данные менеджеров (в реальности должны приходить с сервера)
  managersStats: ManagerStats[] = [
    {
      managerId: '1',
      managerName: 'Анна Петрова',
      dealsCount: 45,
      totalAmount: 12500000,
      averageAmount: 277777,
      conversionRate: 78.5,
      wonDeals: 35,
      lostDeals: 8,
      activeDeals: 2,
      averageCycleTime: 24
    },
    {
      managerId: '2',
      managerName: 'Иван Сидоров',
      dealsCount: 38,
      totalAmount: 8750000,
      averageAmount: 230263,
      conversionRate: 65.2,
      wonDeals: 25,
      lostDeals: 10,
      activeDeals: 3,
      averageCycleTime: 31
    },
    {
      managerId: '3',
      managerName: 'Мария Иванова',
      dealsCount: 52,
      totalAmount: 15200000,
      averageAmount: 292307,
      conversionRate: 82.1,
      wonDeals: 43,
      lostDeals: 6,
      activeDeals: 3,
      averageCycleTime: 19
    },
    {
      managerId: '4',
      managerName: 'Дмитрий Кузнецов',
      dealsCount: 29,
      totalAmount: 6800000,
      averageAmount: 234482,
      conversionRate: 58.9,
      wonDeals: 17,
      lostDeals: 9,
      activeDeals: 3,
      averageCycleTime: 35
    }
  ];

  getTopPerformer(): ManagerStats | null {
    if (this.managersStats.length === 0) return null;
    return this.managersStats.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );
  }

  getConversionColor(rate: number): string {
    if (rate >= 80) return 'high';
    if (rate >= 60) return 'medium';
    return 'low';
  }

  getPerformanceIndicator(manager: ManagerStats): string {
    const avgConversion = this.getAverageConversion();
    if (manager.conversionRate > avgConversion + 10) return 'excellent';
    if (manager.conversionRate > avgConversion) return 'good';
    if (manager.conversionRate > avgConversion - 10) return 'average';
    return 'needs-improvement';
  }

  getAverageConversion(): number {
    if (this.managersStats.length === 0) return 0;
    const sum = this.managersStats.reduce((acc, m) => acc + m.conversionRate, 0);
    return sum / this.managersStats.length;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'TJS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}