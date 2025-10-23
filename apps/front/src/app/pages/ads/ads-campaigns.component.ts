import { Component, OnInit } from '@angular/core';
import { AdsService, Campaign } from '../../services/ads.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CrmTableComponent, CrmColumn } from '../../shared/components/crm-table/crm-table.component';

@Component({
  selector: 'app-ads-campaigns',
  standalone: true,
  template: `
    <div class="p-4">
      <h2 class="text-xl mb-4">Advertising campaigns</h2>
      <div *ngIf="loading">Loading...</div>
      <crm-table *ngIf="!loading" [title]="'Campaigns'" [columns]="columns" [data]="campaigns" [pageSize]="10" (rowClick)="onRowClicked($event)"></crm-table>
    </div>
  `,
  imports: [CommonModule, CrmTableComponent]
})
export class AdsCampaignsComponent implements OnInit {
  campaigns: Campaign[] = [];
  loading = false;
  columns: CrmColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', cell: (r) => 'View metrics' }
  ];

  constructor(private ads: AdsService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.ads.getCampaigns().subscribe(r => {
      this.loading = false;
      if (r.success && r.data) this.campaigns = r.data;
    }, () => this.loading = false);
  }

  viewMetrics(c: Campaign) {
    if (!c?.id) return;
    this.router.navigate(['/ads', String(c.id)]);
  }

  onRowClicked(row: any) {
    const c: Campaign = row as Campaign;
    if (c?.id) this.router.navigate(['/ads', String(c.id)]);
  }
}
