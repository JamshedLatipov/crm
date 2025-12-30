import {
  Component,
  OnInit,
  input,
} from '@angular/core';
import { AdsService, Campaign } from '../../services/ads.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  CrmTableComponent,
  CrmColumn,
  CrmColumnTemplateDirective,
} from '../../shared/components/crm-table/crm-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ads-campaigns',
  standalone: true,
  template: `
    <div class="p-4">
      <div
        style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px"
      >
        <h2 style="margin:0">Рекламные кампании</h2>
        <div style="display:flex; gap:8px; align-items:center">
          <button mat-stroked-button (click)="refreshCampaigns()">
            Обновить
          </button>
          <button mat-flat-button color="primary" (click)="createCampaign()">
            Создать кампанию
          </button>
        </div>
      </div>

      @if (loading) {
        <div>Загрузка...</div>
      }
      <br />
      @if (!loading) {
        <crm-table
          [columns]="columns"
          [data]="campaigns"
          [pageSize]="10"
          (rowClick)="onRowClicked($event)"
        >
          <ng-template crmColumnTemplate="actionsTemplate" let-campaign>
            <button mat-button (click)="viewMetrics(campaign)">Показатели</button>
          </ng-template>
        </crm-table>
      }
    </div>
  `,
  imports: [CommonModule, CrmTableComponent, CrmColumnTemplateDirective, MatButtonModule, MatIconModule],
})
export class AdsCampaignsComponent implements OnInit {
  campaigns: Campaign[] = [];
  loading = false;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', template: 'actionsTemplate' },
  ];

  constructor(private ads: AdsService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.ads.getCampaigns().subscribe(
      (r) => {
        this.loading = false;
        if (r.success && r.data) this.campaigns = r.data;
      },
      () => (this.loading = false)
    );
  }

  viewMetrics(c: Campaign) {
    if (!c?.id) return;
    this.router.navigate(['/ads', String(c.id)]);
  }

  onRowClicked(row: any) {
    const c: Campaign = row as Campaign;
    if (c?.id) this.router.navigate(['/ads', String(c.id)]);
  }

  refreshCampaigns() {
    this.loading = true;
    this.ads.getCampaigns().subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success && r.data) this.campaigns = r.data;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  createCampaign() {
    // navigate to campaigns creation screen if exists, otherwise open a placeholder
    this.router.navigate(['/ads', 'new']);
  }
}
