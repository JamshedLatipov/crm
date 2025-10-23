import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdsService } from '../../services/ads.service';
import { Chart, type ChartConfiguration, type ChartOptions } from 'chart.js';

@Component({
  selector: 'app-ads-campaign-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl mb-2">Campaign: {{ campaign?.name }}</h2>
      <div class="mb-4">
        <label>Budget: </label>
        <input [(ngModel)]="budget" type="number" />
        <button (click)="saveBudget()">Save</button>
      </div>
      <div class="mb-4">
        <button (click)="pause()" [disabled]="campaign?.status==='paused'">Pause</button>
        <button (click)="resume()" [disabled]="campaign?.status==='active'">Resume</button>
      </div>

      <h3>Metrics (last {{metrics?.length}} days)</h3>
      <div *ngIf="metrics?.length">
        <canvas #chartCanvas width="600" height="200"></canvas>
      </div>
    </div>
  `
})
export class AdsCampaignDetailComponent implements OnInit, AfterViewInit {
  campaign: any;
  metrics: any[] = [];
  sparkPoints = '';
  private chart: Chart | null = null;
  budget: number | null = null;
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private route: ActivatedRoute, private ads: AdsService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.ads.getCampaigns().subscribe(r => {
      if (r.success && r.data) this.campaign = r.data.find((c: any) => c.id === id);
      this.budget = this.campaign?.budget ?? null;
    });

    this.ads.getCampaignMetrics(id).subscribe(r => {
      if (r.success && r.data) {
        this.metrics = r.data.reverse();
        const labels = this.metrics.map(m => m.date);
        const data = this.metrics.map(m => m.leads);
        // create chart
        this.renderChart(labels, data);
      }
    });
  }

  ngAfterViewInit(): void {
    // if metrics already loaded, render
    if (this.metrics.length) {
      const labels = this.metrics.map(m => m.date);
      const data = this.metrics.map(m => m.leads);
      this.renderChart(labels, data);
    }
  }

  private renderChart(labels: string[], data: number[]) {
    try {
      const canvasEl = this.chartCanvas?.nativeElement;
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;
      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Leads', data, borderColor: '#3b82f6', fill: false }] },
        options: { responsive: true, plugins: { legend: { display: false } } } as ChartOptions
      } as ChartConfiguration);
    } catch (e) {
      console.error('Failed to render chart', e);
    }
  }

  buildSpark(values: number[]) {
    if (!values.length) return '';
    const w = 600, h = 120;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    return values.map((v, i) => {
      const x = Math.round((i / (values.length - 1 || 1)) * w);
      const y = Math.round(h - ((v - min) / range) * (h - 10));
      return `${x},${y}`;
    }).join(' ');
  }

  saveBudget() {
    if (!this.campaign) return;
    this.ads.updateCampaign(this.campaign.id, { budget: this.budget }).subscribe();
  }

  pause() { if (this.campaign) this.ads.pauseCampaign(this.campaign.id).subscribe(r => this.campaign = r.data); }
  resume() { if (this.campaign) this.ads.resumeCampaign(this.campaign.id).subscribe(r => this.campaign = r.data); }
}
