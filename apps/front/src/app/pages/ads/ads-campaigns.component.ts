import { Component, OnInit, Input, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
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
      <crm-table *ngIf="!loading" [columns]="columns" [data]="campaigns" [pageSize]="10" [templates]="tableTemplates" (rowClick)="onRowClicked($event)"></crm-table>
    </div>

    <ng-template #tableTitleTemplate>
      <h3>Campaigns</h3>
    </ng-template>

    <ng-template #actionsTemplate let-campaign>
      View metrics
    </ng-template>
  `,
  imports: [CommonModule, CrmTableComponent]
})
export class AdsCampaignsComponent implements OnInit, AfterViewInit {
  campaigns: Campaign[] = [];
  loading = false;

  @Input() templates: { [key: string]: TemplateRef<any> } = {};

  @ViewChild('tableTitleTemplate') tableTitleTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', template: 'actionsTemplate' }
  ];

  constructor(private ads: AdsService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.ads.getCampaigns().subscribe(r => {
      this.loading = false;
      if (r.success && r.data) this.campaigns = r.data;
    }, () => this.loading = false);
  }

  ngAfterViewInit() {
    // Templates are now available after view init
  }

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      tableTitleTemplate: this.tableTitleTemplate,
      actionsTemplate: this.actionsTemplate
    };
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
