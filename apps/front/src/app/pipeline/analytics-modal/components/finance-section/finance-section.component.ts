import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PipelineAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-finance-section',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './finance-section.component.html',
  styleUrls: ['./finance-section.component.scss']
})
export class FinanceSectionComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() analytics: PipelineAnalytics | null = null;
  @ViewChild('amountCanvas', { static: false }) amountCanvas!: ElementRef<HTMLCanvasElement>;

  private amountChart: Chart | null = null;

  ngAfterViewInit() { this.renderChart(); }
  ngOnChanges(changes: SimpleChanges) {
    if (!changes['analytics']) return;
    // If view not initialized yet, renderChart will run in AfterViewInit
    if (!this.amountCanvas?.nativeElement) return;

    // Recreate chart when analytics changes
    if (this.amountChart) {
      this.amountChart.destroy();
      this.amountChart = null;
    }

    this.renderChart();
  }

  ngOnDestroy() { this.amountChart?.destroy(); }

  private renderChart() {
  if (!this.analytics?.byStage || !this.amountCanvas?.nativeElement) return;
    const ctx = this.amountCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const stages = this.analytics.byStage;
    const labels = stages.map(s => s.name);
    const totalAmounts = stages.map(s => s.totalAmount || 0);
    const avgAmounts = stages.map(s => s.averageAmount || 0);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Общая сумма (₽)', data: totalAmounts, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 2, borderRadius: 8, yAxisID: 'y' },
          { label: 'Средний чек (₽)', data: avgAmounts, backgroundColor: 'rgba(59,130,246,0.7)', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 8, yAxisID: 'y1' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    };

    this.amountChart = new Chart(ctx, config);
  }
}
