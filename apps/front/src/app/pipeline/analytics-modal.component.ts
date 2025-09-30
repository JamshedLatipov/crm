import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { PipelineAnalytics, StageAnalytics } from './dtos';

@Component({
  selector: 'app-analytics-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule
  ],
  templateUrl: './analytics-modal.component.html',
  styleUrls: ['./analytics-modal.component.scss'],
})
export class AnalyticsModalComponent {
  public dialogRef = inject(MatDialogRef<AnalyticsModalComponent>);
  public data = inject<{ analytics: PipelineAnalytics | null }>(MAT_DIALOG_DATA);
  
  selectedTabIndex = 0; // По умолчанию показываем таб с графиком
  
  // Колонки для таблицы
  displayedColumns = ['name', 'count', 'totalAmount', 'averageAmount', 'conversion', 'averageTimeInStage'];

  refreshData() {
    // Закрываем модальное окно с результатом для обновления
    this.dialogRef.close('refresh');
  }

  getFunnelColor(index: number): string {
    const colors = [
      '#4caf50', // Зеленый - начальная стадия
      '#8bc34a', // Светло-зеленый
      '#ffc107', // Желтый
      '#ff9800', // Оранжевый
      '#f44336', // Красный - финальная стадия
      '#9c27b0'  // Фиолетовый
    ];
    return colors[index % colors.length];
  }

  getFunnelWidth(count: number, totalDeals: number): number {
    if (!totalDeals || totalDeals === 0 || !count) return 20; // минимальная ширина
    const percentage = (count / totalDeals) * 100;
    return Math.max(percentage, 20);
  }

  getFunnelPercentage(count: number, totalDeals: number): number {
    if (!totalDeals || totalDeals === 0 || !count) return 0;
    return Math.round((count / totalDeals) * 100);
  }

  getStageTooltip(stage: StageAnalytics): string {
    let tooltip = `${stage.name}\n`;
    tooltip += `Сделок: ${stage.count}\n`;
    if (stage.totalAmount) {
      tooltip += `Сумма: ${stage.totalAmount.toLocaleString('ru-RU')} ₽\n`;
    }
    if (stage.averageAmount) {
      tooltip += `Средний чек: ${stage.averageAmount.toLocaleString('ru-RU')} ₽\n`;
    }
    tooltip += `Конверсия: ${stage.conversion}%`;
    if (stage.averageTimeInStage) {
      tooltip += `\nВремя в этапе: ${stage.averageTimeInStage} дней`;
    }
    return tooltip;
  }

  getNextStage(currentIndex: number): StageAnalytics | null {
    if (!this.data.analytics || currentIndex >= this.data.analytics.byStage.length - 1) {
      return null;
    }
    return this.data.analytics.byStage[currentIndex + 1];
  }

  getConversionRate(currentStage: StageAnalytics, nextStage: StageAnalytics): number {
    if (!currentStage.count || currentStage.count === 0) return 0;
    return Math.round((nextStage.count / currentStage.count) * 100);
  }

  getConversionLoss(currentStage: StageAnalytics, nextStage: StageAnalytics): number {
    return Math.max(0, currentStage.count - nextStage.count);
  }

  getStageIndex(stage: StageAnalytics): number {
    if (!this.data.analytics) return 0;
    return this.data.analytics.byStage.findIndex(s => s.stageId === stage.stageId);
  }

  getConversionClass(conversion: number): string {
    if (conversion >= 80) return 'high';
    if (conversion >= 60) return 'medium-high';
    if (conversion >= 40) return 'medium';
    return 'low';
  }

  exportData() {
    if (!this.data.analytics) return;
    
    // Простой экспорт в JSON
    const dataStr = JSON.stringify(this.data.analytics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `pipeline-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
}