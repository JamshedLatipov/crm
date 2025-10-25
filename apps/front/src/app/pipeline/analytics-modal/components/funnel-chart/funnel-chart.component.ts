import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StageAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-funnel-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './funnel-chart.component.html',
  styleUrls: ['./funnel-chart.component.scss']
})
export class FunnelChartComponent implements AfterViewInit, OnDestroy {
  @Input() stages: StageAnalytics[] | null = null;
  @ViewChild('funnelCanvas', { static: false }) funnelCanvas!: ElementRef<HTMLCanvasElement>;

  private funnelChart: Chart | null = null;

  ngAfterViewInit() {
    this.renderChart();
  }

  averageConversion(): number {
    if (!this.stages || !this.stages.length) return 0;
    const sum = this.stages.reduce((acc, s) => acc + (s.conversion || 0), 0);
    return sum / this.stages.length;
  }

  averageTime(): number {
    if (!this.stages || !this.stages.length) return 0;
    const sum = this.stages.reduce((acc, s) => acc + (s.averageTimeInStage || 0), 0);
    return Math.round(sum / this.stages.length);
  }

  ngOnDestroy() {
    this.funnelChart?.destroy();
  }

  private renderChart() {
    if (!this.stages || !this.funnelCanvas?.nativeElement) return;

    const ctx = this.funnelCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.stages.map(s => s.name);
    const counts = this.stages.map(s => s.count);
    const colors = ['#667eea','#764ba2','#f093fb','#4facfe','#43e97b','#fa709a'];

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Количество сделок',
          data: counts,
          backgroundColor: this.stages.map((_, i) => colors[i % colors.length] + '80'),
          borderColor: this.stages.map((_, i) => colors[i % colors.length]),
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }
      }
    };

    this.funnelChart = new Chart(ctx, config);
  }
}
