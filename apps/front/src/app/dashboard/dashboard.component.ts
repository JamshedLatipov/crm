import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LeadService } from '../leads/services/lead.service';
import { DealsService } from '../pipeline/deals.service';
import { ContactsService } from '../contacts/contacts.service';
import { CallsApiService } from '../services/calls.service';
import { LeadStatistics } from '../leads/models/lead.model';
import { ActivityService, ActivityItem } from '../services/activity.service';
import { Router } from '@angular/router';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, PageLayoutComponent],
  template: `
    <app-page-layout title="Панель управления" subtitle="Добро пожаловать в CRM">
      <div class="dashboard-grid">
        <div class="main-column">
        <!-- Stats Cards -->
        <mat-card class="stat-card leads">
          <div class="stat-content">
            <div class="stat-info">
              <h3>{{ leadsStats()?.totalLeads ?? '—' }}</h3>
              <p>Лиды</p>
            </div>
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="stat-change positive" *ngIf="leadsStats()">+{{ leadsStats()?.newLeads ?? 0 }} новых</div>
        </mat-card>

        <mat-card class="stat-card deals">
          <div class="stat-content">
            <div class="stat-info">
              <h3>{{ dealsCount() ?? '—' }}</h3>
              <p>Сделки</p>
            </div>
            <div class="stat-icon">
              <mat-icon>handshake</mat-icon>
            </div>
          </div>
          <div class="stat-change positive">активны</div>
        </mat-card>

        <mat-card class="stat-card contacts">
          <div class="stat-content">
            <div class="stat-info">
              <h3>{{ contactsStats()?.total ?? '—' }}</h3>
              <p>Контакты</p>
            </div>
            <div class="stat-icon">
              <mat-icon>people</mat-icon>
            </div>
          </div>
          <div class="stat-change neutral">{{ contactsStats()?.recentlyCreated ?? 0 }} новых</div>
        </mat-card>

        <mat-card class="stat-card calls">
          <div class="stat-content">
            <div class="stat-info">
              <h3>{{ callStats()?.activeCalls ?? '—' }}</h3>
              <p>Колл-центр (активные)</p>
            </div>
            <div class="stat-icon">
              <mat-icon>call</mat-icon>
            </div>
          </div>
          <div class="stat-change neutral">Сегодня: {{ callStats()?.callsStartedToday ?? 0 }} звонков</div>
        </mat-card>

  <mat-card class="stat-card revenue">
          <div class="stat-content">
            <div class="stat-info">
              <h3>{{ revenueForecast()?.totalAmount ? (revenueForecast()?.totalAmount | number:'1.0-0') : '—' }}</h3>
              <p>Прогноз выручки (мес.)</p>
            </div>
            <div class="stat-icon">
              <mat-icon>attach_money</mat-icon>
            </div>
          </div>
          <div class="stat-change positive">{{ revenueForecast()?.dealsCount ?? 0 }} сделок</div>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card class="quick-actions-card">
          <div class="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div class="actions-grid">
            <button mat-raised-button color="primary" class="action-btn">
              <mat-icon>add</mat-icon>
              New Lead
            </button>
            <button mat-raised-button class="action-btn">
              <mat-icon>person_add</mat-icon>
              Add Contact
            </button>
            <button mat-raised-button class="action-btn">
              <mat-icon>call</mat-icon>
              Make Call
            </button>
            <button mat-raised-button class="action-btn">
              <mat-icon>email</mat-icon>
              Send Email
            </button>
          </div>
        </mat-card>

        <!-- Top Users -->
        <mat-card class="top-users-card">
          <div class="card-header">
            <h2>Топ пользователей</h2>
          </div>
          <div class="top-users-list">
            <div *ngIf="topUsers()?.length; else noUsers">
              <div class="top-user-item" *ngFor="let u of topUsers()">
                <div>
                  <strong>{{ u.userName }}</strong>
                  <div class="muted">{{ u.changesCount }} изменений</div>
                </div>
                <div class="muted small">{{ u.lastActivity | date:'short' }}</div>
              </div>
            </div>
            <ng-template #noUsers>
              <div class="muted">Нет данных по активности пользователей</div>
            </ng-template>
          </div>
        </mat-card>

        </div>

        <!-- Recent Activity (right sidebar) -->
        <mat-card class="activity-card" role="region" aria-label="Последние действия">
          <div class="card-header">
            <h2>Recent Activity</h2>
            <button mat-button aria-label="Просмотреть все события">View All</button>
          </div>
          <div class="activity-list">
            <ng-container *ngIf="recentActivity()?.length; else noActivity">
              <ng-container *ngFor="let act of recentActivity()">
                <a *ngIf="getActivityLink(act); else plainItem"
                   [routerLink]="getActivityLink(act)"
                   class="activity-item link">
                  <div class="activity-icon" [ngClass]="{
                    'leads': act.source === 'lead',
                    'deals': act.source === 'deal',
                    'contacts': act.source === 'contact'
                  }">
                    <mat-icon>{{ act.icon || 'history' }}</mat-icon>
                  </div>
                  <div class="activity-content">
                    <p [innerHTML]="act.title"></p>
                    <span class="activity-time">{{ act.createdAt | date:'short' }}</span>
                  </div>
                </a>
                <ng-template #plainItem>
                  <div class="activity-item">
                    <div class="activity-icon" [ngClass]="{
                      'leads': act.source === 'lead',
                      'deals': act.source === 'deal',
                      'contacts': act.source === 'contact'
                    }">
                      <mat-icon>{{ act.icon || 'history' }}</mat-icon>
                    </div>
                    <div class="activity-content">
                      <p [innerHTML]="act.title"></p>
                      <span class="activity-time">{{ act.createdAt | date:'short' }}</span>
                    </div>
                  </div>
                </ng-template>
              </ng-container>
            </ng-container>
            <ng-template #noActivity>
              <div class="activity-item empty">
                <div class="activity-content">
                  <p>Нет недавней активности</p>
                </div>
              </div>
            </ng-template>
          </div>
        </mat-card>

      </div>
    </app-page-layout>
  `,
  styles: [`
    .dashboard-grid {
      display: grid;
      /* Left: main content, Right: activity sidebar */
      grid-template-columns: 1fr 360px;
      gap: 24px;
      align-items: start;
      /* Ensure grid takes available vertical space so sidebar can span full height */
      align-content: start;
    }

    .main-column {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      align-items: start;
    }

    /* Stat Cards */
    .stat-card {
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .stat-info h3 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #1f2937;
    }

    .stat-info p {
      margin: 0;
      color: #6b7280;
      font-weight: 500;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.leads .stat-icon {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .stat-card.deals .stat-icon {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .stat-card.contacts .stat-icon {
      background: rgba(168, 85, 247, 0.1);
      color: #a855f7;
    }

    .stat-card.revenue .stat-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      display: block;
      margin: auto;
      line-height: 1;
    }

    .stat-change {
      font-size: 14px;
      font-weight: 600;
    }

    .stat-change.positive {
      color: #22c55e;
    }

    .stat-change.neutral {
      color: #6b7280;
    }

    /* Activity Card */
    .activity-card {
      /* Force the activity card into the right column and span full grid rows */
      grid-column: 2 / 3;
      grid-row: 1 / -1;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      /* Let the activity area be its own scrollable column that fills the viewport */
      height: calc(100vh - 140px);
      overflow: auto;
      position: sticky;
      top: 20px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .activity-icon.leads {
      background: #22c55e;
    }

    .activity-icon.deals {
      background: #3b82f6;
    }

    .activity-icon.contacts {
      background: #a855f7;
    }

    .activity-content {
      flex: 1;
    }

    .activity-content p {
      margin: 0 0 4px 0;
      color: #1f2937;
      font-size: 14px;
    }

    .activity-time {
      color: #6b7280;
      font-size: 12px;
    }

    .activity-item.link {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #fff;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }

    .activity-item.link:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }

    /* Quick Actions */
    .quick-actions-card {
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
    }

    /* Make quick actions and top-users span full width of main-column */
    .main-column .quick-actions-card,
    .main-column .top-users-card {
      grid-column: 1 / -1;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .action-btn {
      padding: 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .top-users-card {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .top-users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .top-user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border-radius: 8px;
      background: #fafafa;
    }

    .muted {
      color: #6b7280;
      font-size: 13px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      /* Collapse to single column on smaller screens; activity moves inline */
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .activity-card {
        position: relative;
        grid-column: span 1;
        grid-row: auto;
        height: auto;
        overflow: visible;
        top: auto;
      }
    }
  `]
})
export class DashboardComponent {
  private readonly leadService = inject(LeadService);
  private readonly dealsService = inject(DealsService);
  private readonly contactsService = inject(ContactsService);

  loading = signal(true);

  leadsStats = signal<LeadStatistics | null>(null);
  dealsCount = signal<number | null>(null);
  contactsStats = signal<any | null>(null);
  revenueForecast = signal<any | null>(null);
  recentActivity = signal<ActivityItem[]>([]);
  topUsers = signal<Array<{ userId: string; userName: string; changesCount: number; lastActivity: string }>>([]);
  callStats = signal<any | null>(null);

  private readonly activityService = inject(ActivityService);
  private readonly callsApi = inject(CallsApiService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    let pending = 4;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loading.set(false);
    };

    this.leadService.getLeadStatistics().subscribe({
      next: (s) => this.leadsStats.set(s),
      error: (e) => console.error('Lead stats error', e),
      complete: done
    });

    this.dealsService.listDeals().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.dealsCount.set(res.length ?? 0);
        } else {
          this.dealsCount.set((res as any).total ?? ((res as any).items?.length ?? 0));
        }
      },
      error: (e) => console.error('Deals list error', e),
      complete: done
    });

    this.dealsService.getSalesForecast('month').subscribe({
      next: (f) => this.revenueForecast.set(f),
      error: (e) => console.error('Forecast error', e),
      complete: done
    });

    this.contactsService.getContactsStats().subscribe({
      next: (c) => this.contactsStats.set(c),
      error: (e) => console.error('Contacts stats error', e),
      complete: done
    });

    // Load recent activity (separately but as part of dashboard load)
    this.activityService.getRecentActivity(8).subscribe({
      next: (items) => this.recentActivity.set(items),
      error: (e) => console.error('Activity load error', e)
    });

    this.activityService.getTopUsers(5).subscribe({
      next: (users) => this.topUsers.set(users),
      error: (e) => console.error('Top users load error', e)
    });

    this.callsApi.getRuntimeStats().subscribe({
      next: (s) => this.callStats.set(s),
      error: (e) => console.error('Call stats error', e)
    });
  }

  getActivityLink(act: ActivityItem): string[] | null {
    try {
      const meta: any = act.meta as any;
      if (act.source === 'lead' && meta && (meta.lead || meta.leadId || meta.lead_id)) {
        const id = meta.lead?.id ?? meta.leadId ?? meta.lead_id;
        return ['/leads/view', String(id)];
      }
      if (act.source === 'deal' && meta && (meta.deal || meta.dealId || meta.deal_id)) {
        const id = meta.deal?.id ?? meta.dealId ?? meta.deal_id;
        return ['/deals/view', String(id)];
      }
      if (act.source === 'contact' && meta && (meta.contact || meta.contactId || meta.contact_id)) {
        const id = meta.contact?.id ?? meta.contactId ?? meta.contact_id;
        return ['/contacts/view', String(id)];
      }
    } catch (err) {
      // fallthrough
    }
    return null;
  }
}
