import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-campaign-stats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    PageLayoutComponent
  ],
  templateUrl: './campaign-stats.component.html',
  styleUrl: './campaign-stats.component.scss'
})
export class CampaignStatsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  campaignId = signal<string>('');
  stats = signal({
    sent: 850,
    delivered: 820,
    failed: 30,
    total: 1000,
    deliveryRate: 96.5,
    startedAt: '30.12.2025 10:00',
    completedAt: null as string | null
  });

  progressPercent = computed(() => {
    const s = this.stats();
    return Math.round((s.sent / s.total) * 100);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.campaignId.set(id || '');
    // TODO: Загрузить статистику через сервис
  }
}
