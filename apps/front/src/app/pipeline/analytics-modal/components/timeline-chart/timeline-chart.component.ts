import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StageAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-timeline-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.scss']
})
export class TimelineChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() stages: StageAnalytics[] | null = null;
  @ViewChild('timelineCanvas', { static: false }) timelineCanvas!: ElementRef<HTMLCanvasElement>;

  private timelineChart: Chart | null = null;

  ngAfterViewInit() { this.renderChart(); }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['stages']) return;
    // If view not initialized yet, renderChart will run in AfterViewInit
    if (!this.timelineCanvas?.nativeElement) return;

    // If chart exists, update it; otherwise create it
    if (this.timelineChart) {
      const labels = this.stages?.map(s => s.name) || [];
      const timeData = this.stages?.map(s => s.averageTimeInStage || 0) || [];
      this.timelineChart.data.labels = labels as any;
      if (this.timelineChart.data.datasets && this.timelineChart.data.datasets[0]) {
        this.timelineChart.data.datasets[0].data = timeData as any;
      }
      this.timelineChart.update();
    } else {
      this.renderChart();
    }
  }

  ngOnDestroy() { this.timelineChart?.destroy(); }

  averageTime(): number {
    if (!this.stages || !this.stages.length) return 0;
    const sum = this.stages.reduce((acc, s) => acc + (s.averageTimeInStage || 0), 0);
    return Math.round(sum / this.stages.length);
  }

  private renderChart() {
    if (!this.stages || !this.timelineCanvas?.nativeElement) return;
    const ctx = this.timelineCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.stages.map(s => s.name);
    const timeData = this.stages.map(s => s.averageTimeInStage || 0);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Среднее время (дни)',
          data: timeData,
          backgroundColor: this.stages.map((_, i) => {
            const colors = [
              'rgba(102, 126, 234, 0.8)',
              'rgba(139, 195, 74, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(255, 152, 0, 0.8)',
              'rgba(244, 67, 54, 0.8)',
              'rgba(156, 39, 176, 0.8)'
            ];
            return colors[i % colors.length];
          }),
          borderColor: this.stages.map((_, i) => {
            const colors = ['#667eea','#8bc34a','#ffc107','#ff9800','#f44336','#9c27b0'];
            return colors[i % colors.length];
          }),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Временная диаграмма - Среднее время в каждом этапе' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Дни' } }, x: { grid: { display: false } } }
      }
    };

    this.timelineChart = new Chart(ctx, config);
  }
}
