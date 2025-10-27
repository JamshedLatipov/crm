import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { PipelineAnalytics, StageAnalytics } from '../dtos';
import { AnalyticsSummaryComponent } from './components/analytics-summary/analytics-summary.component';
import { FunnelChartComponent } from './components/funnel-chart/funnel-chart.component';
import { StagesTableComponent } from './components/stages-table/stages-table.component';
import { ConversionSectionComponent } from './components/conversion-section/conversion-section.component';
import { TimelineChartComponent } from './components/timeline-chart/timeline-chart.component';
import { FinanceSectionComponent } from './components/finance-section/finance-section.component';
import { TrendsChartComponent } from './components/trends-chart/trends-chart.component';
import { ManagersAnalysisComponent } from './components/managers-analysis/managers-analysis.component';
import { ForecastComponent } from './components/forecast-component/forecast-component.component';

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
    MatTableModule,
    AnalyticsSummaryComponent,
    FunnelChartComponent,
    StagesTableComponent,
    ConversionSectionComponent
    ,
    TimelineChartComponent,
    FinanceSectionComponent,
    TrendsChartComponent,
    ManagersAnalysisComponent,
    ForecastComponent
  ],
  templateUrl: './analytics-modal.component.html',
  styleUrl: './analytics-modal.component.scss',
})
export class AnalyticsModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<AnalyticsModalComponent>);
  public data = inject<{ analytics: PipelineAnalytics | null }>(MAT_DIALOG_DATA);
  selectedTabIndex = 0; // По умолчанию показываем таб с графиком
  
  // Колонки для таблицы
  displayedColumns = ['name', 'count', 'totalAmount', 'averageAmount', 'conversion', 'averageTimeInStage'];
  ngOnInit() {
    // Инициализируем графики после небольшой задержки
    setTimeout(() => {
      // child components initialize their own charts on AfterViewInit
      this.initCharts();
    }, 100);
  }

  initCharts() {
    // intentionally left blank — child components initialize their own charts
  }

  refreshData() {
    // Закрываем модальное окно с результатом для обновления
    this.dialogRef.close('refresh');
  }

  getStageIndex(stage: StageAnalytics): number {
    if (!this.data.analytics) return 0;
    return this.data.analytics.byStage.findIndex(s => s.stageId === stage.stageId);
  }

  getFunnelColor(index: number): string {
    const colors = [
      '#667eea',
      '#764ba2', 
      '#f093fb',
      '#4facfe',
      '#43e97b',
      '#fa709a'
    ];
    return colors[index % colors.length];
  }

  getConversionClass(conversion: number): string {
    if (conversion >= 80) return 'high';
    if (conversion >= 60) return 'medium-high';
    if (conversion >= 40) return 'medium';
    return 'low';
  }

  getBestStage(): StageAnalytics | null {
    if (!this.data.analytics?.byStage?.length) return null;
    return this.data.analytics.byStage.reduce((best, current) => 
      current.conversion > best.conversion ? current : best
    );
  }

  getWorstStage(): StageAnalytics | null {
    if (!this.data.analytics?.byStage?.length) return null;
    // Находим этап с самой низкой конверсией (но исключаем нулевые)
    const stagesWithConversion = this.data.analytics.byStage.filter(s => s.conversion > 0);
    if (stagesWithConversion.length === 0) return null;
    return stagesWithConversion.reduce((worst, current) => 
      current.conversion < worst.conversion ? current : worst
    );
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
