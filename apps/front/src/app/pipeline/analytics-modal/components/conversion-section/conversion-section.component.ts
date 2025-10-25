import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StageAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-conversion-section',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './conversion-section.component.html',
  styleUrls: ['./conversion-section.component.scss']
})
export class ConversionSectionComponent implements AfterViewInit, OnDestroy {
  @Input() stages: StageAnalytics[] | null = null;
  @ViewChild('conversionCanvas', { static: false }) conversionCanvas!: ElementRef<HTMLCanvasElement>;

  private conversionChart: Chart | null = null;

  ngAfterViewInit() { this.renderChart(); }
  ngOnDestroy() { this.conversionChart?.destroy(); }

  private renderChart() {
    if (!this.stages || !this.conversionCanvas?.nativeElement) return;
    const ctx = this.conversionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.stages.map(s => s.name);
    const conversionData = this.stages.map(s => s.conversion);
    const countData = this.stages.map(s => s.count);

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Конверсия (%)', data: conversionData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', borderWidth: 3, fill: true, tension: 0.4 },
        { label: 'Количество сделок', data: countData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 3, fill: true, tension: 0.4 }
      ] },
      options: { responsive: true, maintainAspectRatio: false }
    };

    this.conversionChart = new Chart(ctx, config);
  }

  getBestStage() {
    if (!this.stages?.length) return null;
    return this.stages.reduce((best, cur) => cur.conversion > best.conversion ? cur : best);
  }

  getWorstStage() {
    if (!this.stages?.length) return null;
    const withConv = this.stages.filter(s => s.conversion > 0);
    if (!withConv.length) return null;
    return withConv.reduce((worst, cur) => cur.conversion < worst.conversion ? cur : worst);
  }
}
