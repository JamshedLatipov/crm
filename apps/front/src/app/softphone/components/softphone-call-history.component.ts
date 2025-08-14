import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SoftphoneCallHistoryService, CdrRecord } from './softphone-call-history.service';
import { environment } from '../../../environments/environment';

// CdrRecord interface now imported from service

@Component({
  selector: 'app-softphone-call-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between mb-3">
        <h3
          class="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2"
        >
          <span class="material-icons text-base">history</span> Call History
        </h3>
        <button
          (click)="refresh()"
          class="text-xs px-2 py-1 border border-[var(--border-color)] rounded hover:bg-[var(--muted-color)]/60 flex items-center gap-1"
        >
          <span class="material-icons text-[14px]">refresh</span> Refresh
        </button>
      </div>
      <div class="flex gap-2 mb-3">
        <input
          type="date"
          [(ngModel)]="fromDate"
          class="flex-1 min-w-0 border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--surface-color)]"
        />
        <input
          type="date"
          [(ngModel)]="toDate"
          class="flex-1 min-w-0 border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--surface-color)]"
        />
        <input
          placeholder="Search"
          [(ngModel)]="search"
          class="flex-1 min-w-0 border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--surface-color)]"
        />
        <button
          (click)="applyFilters()"
          class="text-xs px-3 py-1 bg-[var(--primary-color)] text-white rounded hover:opacity-90"
        >
          Go
        </button>
      </div>
      <div
        class="overflow-auto flex-1 border border-[var(--border-color)] rounded"
      >
        <table class="w-full text-sm">
          <thead
            class="bg-[var(--muted-color)]/50 text-[var(--text-secondary)]"
          >
            <tr>
              <th class="p-2 text-left">Time</th>
              <th class="p-2 text-left">From</th>
              <th class="p-2 text-left">To</th>
              <th class="p-2 text-left">Disp</th>
              <th class="p-2 text-left">Dur</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let r of records()"
              class="border-t border-[var(--border-color)] hover:bg-[var(--muted-color)]/30 cursor-pointer"
              (click)="select(r)"
            >
              <td class="p-2 whitespace-nowrap">
                {{ r.calldate | date : 'HH:mm:ss' }}
              </td>
              <td class="p-2">{{ r.src }}</td>
              <td class="p-2">{{ r.dst }}</td>
              <td class="p-2">{{ r.disposition }}</td>
              <td class="p-2">{{ r.duration }}s</td>
            </tr>
            <tr *ngIf="!loading() && records().length === 0">
              <td
                colspan="5"
                class="p-4 text-center text-[var(--text-secondary)]"
              >
                No records
              </td>
            </tr>
            <tr *ngIf="loading()">
              <td
                colspan="5"
                class="p-4 text-center text-[var(--text-secondary)]"
              >
                Loading...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="flex items-center justify-between mt-2 text-xs text-[var(--text-secondary)]"
      >
        <div>Total: {{ total() }}</div>
        <div class="flex gap-1">
          <button
            (click)="prevPage()"
            [disabled]="page() === 1"
            class="px-2 py-1 border border-[var(--border-color)] rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span class="px-2 py-1">{{ page() }}</span>
          <button
            (click)="nextPage()"
            [disabled]="page() * limit >= total()"
            class="px-2 py-1 border border-[var(--border-color)] rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SoftphoneCallHistoryComponent implements OnInit {
  @Input() apiBase = environment.apiBase;
  // Operator id whose calls we show (primary filter)
  @Input() operatorId?: string;
  records = signal<CdrRecord[]>([]);
  total = signal(0);
  page = signal(1);
  limit = 25;
  loading = signal(false);
  fromDate?: string;
  toDate?: string;
  search = '';

  private historyService = inject(SoftphoneCallHistoryService);

  ngOnInit() {
    this.refresh();
  }

  buildParams() {
    const params: Record<string, string> = {
      page: String(this.page()),
      limit: String(this.limit),
    };
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;
    if (this.search) params['search'] = this.search;
    if (this.operatorId) params['operatorId'] = this.operatorId;
    return params;
  }

  refresh() {
    this.loading.set(true);
    this.historyService.list(this.apiBase, this.buildParams()).subscribe({
      next: (res) => {
        this.records.set(res.data || []);
        this.total.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
  applyFilters() {
    this.page.set(1);
    this.refresh();
  }
  nextPage() {
    this.page.update((p) => p + 1);
    this.refresh();
  }
  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.refresh();
    }
  }
  select(r: CdrRecord) {
    /* placeholder for future detail usage */ void r;
  }
}
