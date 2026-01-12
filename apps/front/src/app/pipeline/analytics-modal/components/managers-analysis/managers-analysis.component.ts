import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { PipelineAnalytics, StageAnalytics, Deal } from '../../../dtos';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CrmTableComponent, CrmColumn } from '../../../../shared/components/crm-table/crm-table.component';
import { CurrencyService } from '../../../../services/currency.service';
import { ExchangeRateService } from '../../../../services/exchange-rate.service';

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
    MatProgressBarModule,
    MatChipsModule,
    CrmTableComponent
  ],
  templateUrl: './managers-analysis.component.html',
  styleUrls: ['./managers-analysis.component.scss']
})
export class ManagersAnalysisComponent implements OnInit {
  @Input() analytics: PipelineAnalytics | null = null;
  
  private http = inject(HttpClient);
  private currencyService = inject(CurrencyService);
  private exchangeRateService = inject(ExchangeRateService);
  private apiUrl = `${environment.apiBase}/pipeline`;

  managersStats: ManagerStats[] = [];
  isLoading = true;

  // Конфигурация колонок для crm-table
  columns: CrmColumn[] = [
    {
      key: 'managerName',
      label: 'Менеджер',
      sortable: true,
      cell: (row: ManagerStats) => row.managerName
    },
    {
      key: 'dealsCount',
      label: 'Всего сделок',
      sortable: true,
      cell: (row: ManagerStats) => row.dealsCount
    },
    {
      key: 'wonDeals',
      label: 'Выиграно',
      sortable: true,
      cell: (row: ManagerStats) => row.wonDeals
    },
    {
      key: 'activeDeals',
      label: 'Активных',
      sortable: true,
      cell: (row: ManagerStats) => row.activeDeals
    },
    {
      key: 'lostDeals',
      label: 'Проиграно',
      sortable: true,
      cell: (row: ManagerStats) => row.lostDeals
    },
    {
      key: 'totalAmount',
      label: 'Общая сумма',
      sortable: true,
      template: 'totalAmount'
    },
    {
      key: 'averageAmount',
      label: 'Средняя сумма',
      sortable: true,
      template: 'averageAmount'
    },
    {
      key: 'conversionRate',
      label: 'Конверсия',
      sortable: true,
      template: 'conversionRate'
    },
    {
      key: 'averageCycleTime',
      label: 'Цикл (дни)',
      sortable: true,
      cell: (row: ManagerStats) => row.averageCycleTime
    },
    {
      key: 'performance',
      label: 'Показатель',
      sortable: false,
      template: 'performance'
    }
  ];

  ngOnInit() {
    this.loadManagersData();
  }

  async loadManagersData() {
    try {
      // Получаем все deals для анализа
      const deals = await this.http.get<Deal[]>(`${this.apiUrl}/deals`).toPromise();
      
      if (deals && deals.length > 0) {
        this.managersStats = this.calculateManagersStats(deals);
      } else {
        this.managersStats = [];
      }
    } catch (error) {
      console.error('Error loading managers data:', error);
      this.managersStats = [];
    } finally {
      this.isLoading = false;
    }
  }

  private calculateManagersStats(deals: Deal[]): ManagerStats[] {
    const managerMap = new Map<string, {
      deals: Deal[];
      wonDeals: number;
      lostDeals: number;
      activeDeals: number;
    }>();

    // Группируем сделки по менеджерам
    deals.forEach(deal => {
      if (!deal.assignedTo) return;

      if (!managerMap.has(deal.assignedTo)) {
        managerMap.set(deal.assignedTo, {
          deals: [],
          wonDeals: 0,
          lostDeals: 0,
          activeDeals: 0
        });
      }

      const manager = managerMap.get(deal.assignedTo)!;
      manager.deals.push(deal);

      if (deal.status === 'won') {
        manager.wonDeals++;
      } else if (deal.status === 'lost') {
        manager.lostDeals++;
      } else {
        manager.activeDeals++;
      }
    });

    // Вычисляем статистику для каждого менеджера
    return Array.from(managerMap.entries()).map(([managerId, data]) => {
      
      // Подсчёт суммы с конвертацией валют
      const totalAmount = data.deals
        .filter(d => d.status === 'won')
        .reduce((sum, d) => {
          const amount = d.amount || 0;
          
          // Используем сохранённый курс если есть, иначе текущий
          let convertedAmount: number;
          if (d.exchangeRate && d.currency !== 'RUB') {
            // Используем сохранённый курс для конвертации
            convertedAmount = amount * d.exchangeRate;
          } else {
            // Используем текущий курс
            convertedAmount = this.exchangeRateService.convert(
              amount,
              d.currency || 'RUB',
              this.exchangeRateService.getBaseCurrency()
            );
          }
          
          return sum + convertedAmount;
        }, 0);
      
      const totalDeals = data.wonDeals + data.lostDeals + data.activeDeals;
      const averageAmount = data.wonDeals > 0 ? totalAmount / data.wonDeals : 0;
      const conversionRate = totalDeals > 0 ? (data.wonDeals / totalDeals) * 100 : 0;

      // Вычисляем средний цикл сделки (дни от создания до закрытия)
      const closedDeals = data.deals.filter(d => d.status === 'won' && d.actualCloseDate);
      const averageCycleTime = closedDeals.length > 0
        ? closedDeals.reduce((sum, d) => {
            const created = new Date(d.createdAt).getTime();
            const closed = new Date(d.actualCloseDate!).getTime();
            return sum + (closed - created) / (1000 * 60 * 60 * 24);
          }, 0) / closedDeals.length
        : 0;

      return {
        managerId,
        managerName: this.getManagerName(managerId),
        dealsCount: totalDeals,
        totalAmount,
        averageAmount,
        conversionRate,
        wonDeals: data.wonDeals,
        lostDeals: data.lostDeals,
        activeDeals: data.activeDeals,
        averageCycleTime: Math.round(averageCycleTime)
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate); // Сортируем по конверсии
  }

  private getManagerName(managerId: string): string {
    // TODO: Получить реальное имя менеджера из справочника пользователей
    // Пока возвращаем ID как имя
    return `Менеджер ${managerId}`;
  }

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
    return this.currencyService.formatAmount(amount);
  }
}