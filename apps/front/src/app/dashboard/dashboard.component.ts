import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { LeadService } from '../leads/services/lead.service';
import { DealsService } from '../pipeline/deals.service';
import { ContactsService } from '../contacts/contacts.service';
import { CallsApiService } from '../services/calls.service';
import { ExchangeRateService } from '../services/exchange-rate.service';
import { LeadStatistics } from '../leads/models/lead.model';
import { ActivityService, ActivityItem } from '../services/activity.service';
import { Router } from '@angular/router';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';
import { CurrencyFormatPipe } from '../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    PageLayoutComponent,
    CurrencyFormatPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private readonly leadService = inject(LeadService);
  private readonly dealsService = inject(DealsService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  
  // Computed signals для трендов и процентов
  leadConversionRate = computed(() => {
    const stats = this.leadsStats();
    if (!stats) return 0;
    
    // Используем готовый conversionRate из API или вычисляем сами
    if (stats.conversionRate !== undefined && stats.conversionRate !== null) {
      return Math.round(stats.conversionRate);
    }
    
    // Fallback: вычисляем сами если API не вернул
    if (!stats.totalLeads || stats.totalLeads === 0) return 0;
    const converted = stats.convertedLeads ?? 0;
    return Math.round((converted / stats.totalLeads) * 100);
  });
  
  dealSuccessRate = computed(() => {
    const deals = this.dealsList();
    if (!deals || deals.length === 0) return 0;
    
    const wonDeals = deals.filter(d => d.status === 'won').length;
    return Math.round((wonDeals / deals.length) * 100);
  });
  
  avgCallDuration = computed(() => {
    const stats = this.callStats();
    if (!stats || !stats.totalCalls || stats.totalCalls === 0) return '0:00';
    const avgSeconds = Math.round(stats.totalDuration / stats.totalCalls);
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = avgSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });
  private readonly contactsService = inject(ContactsService);

  loading = signal(true);

  leadsStats = signal<LeadStatistics | null>(null);
  dealsCount = signal<number | null>(null);
  dealsList = signal<any[]>([]); // Добавляем для хранения списка сделок
  contactsStats = signal<any | null>(null);
  
  // Computed signal для revenue на основе ВСЕХ выигранных сделок с ростом по месяцам
  revenueForecast = computed(() => {
    const deals = this.dealsList();
    const now = new Date();
    
    // ВСЕ выигранные сделки для общей суммы
    const allWonDeals = deals.filter(d => d.status === 'won');
    
    // Текущий месяц для расчета роста
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Предыдущий месяц для расчета роста
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Фильтруем выигранные сделки за текущий месяц (для процента роста)
    const currentMonthWonDeals = deals.filter(d => {
      if (d.status !== 'won') return false;
      // Используем actualCloseDate если есть, иначе updatedAt
      const closeDate = d.actualCloseDate ? new Date(d.actualCloseDate) : new Date(d.updatedAt || d.createdAt);
      return closeDate >= currentMonthStart && closeDate <= currentMonthEnd;
    });
    
    // Фильтруем выигранные сделки за предыдущий месяц (для процента роста)
    const prevMonthWonDeals = deals.filter(d => {
      if (d.status !== 'won') return false;
      // Используем actualCloseDate если есть, иначе updatedAt
      const closeDate = d.actualCloseDate ? new Date(d.actualCloseDate) : new Date(d.updatedAt || d.createdAt);
      return closeDate >= prevMonthStart && closeDate <= prevMonthEnd;
    });
    
    // Вычисляем ОБЩУЮ сумму ВСЕХ выигранных сделок с конвертацией валют
    const totalAmount = allWonDeals.reduce((sum, deal) => {
      const amount = typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount) || 0;
      
      let convertedAmount: number;
      if (deal.exchangeRate && deal.currency !== 'RUB') {
        convertedAmount = amount * deal.exchangeRate;
      } else {
        convertedAmount = this.exchangeRateService.convert(
          amount,
          deal.currency || 'RUB',
          this.exchangeRateService.getBaseCurrency()
        );
      }
      
      return sum + convertedAmount;
    }, 0);
    
    // Вычисляем сумму текущего месяца для роста
    const currentMonthAmount = currentMonthWonDeals.reduce((sum, deal) => {
      const amount = typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount) || 0;
      
      let convertedAmount: number;
      if (deal.exchangeRate && deal.currency !== 'RUB') {
        convertedAmount = amount * deal.exchangeRate;
      } else {
        convertedAmount = this.exchangeRateService.convert(
          amount,
          deal.currency || 'RUB',
          this.exchangeRateService.getBaseCurrency()
        );
      }
      
      return sum + convertedAmount;
    }, 0);
    
    // Вычисляем сумму предыдущего месяца для роста
    const prevMonthAmount = prevMonthWonDeals.reduce((sum, deal) => {
      const amount = typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount) || 0;
      
      let convertedAmount: number;
      if (deal.exchangeRate && deal.currency !== 'RUB') {
        convertedAmount = amount * deal.exchangeRate;
      } else {
        convertedAmount = this.exchangeRateService.convert(
          amount,
          deal.currency || 'RUB',
          this.exchangeRateService.getBaseCurrency()
        );
      }
      
      return sum + convertedAmount;
    }, 0);
    
    // Вычисляем процент роста по месяцам
    let growthPercentage = 0;
    if (prevMonthAmount > 0) {
      growthPercentage = +((currentMonthAmount - prevMonthAmount) / prevMonthAmount * 100).toFixed(2);
    } else if (currentMonthAmount > 0) {
      growthPercentage = 100;
    }
    
    return {
      totalAmount, // ОБЩАЯ сумма всех выигранных сделок
      dealsCount: allWonDeals.length, // Количество ВСЕХ выигранных сделок
      growthPercentage, // Процент роста текущего месяца к предыдущему
      prevTotalAmount: prevMonthAmount
    };
  });
  recentActivity = signal<ActivityItem[]>([]);
  topUsers = signal<Array<{ userId: string; userName: string; changesCount: number; lastActivity: string }>>([]);
  callStats = signal<any | null>(null);

  private readonly activityService = inject(ActivityService);
  private readonly callsApi = inject(CallsApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

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
        let deals: any[] = [];
        if (Array.isArray(res)) {
          deals = res;
          this.dealsCount.set(res.length ?? 0);
        } else {
          deals = (res as any).items ?? [];
          this.dealsCount.set((res as any).total ?? deals.length);
        }
        this.dealsList.set(deals); // Сохраняем список для вычисления успешности и revenue
      },
      error: (e) => console.error('Deals list error', e),
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

  // Quick Actions methods
  createNewLead(): void {
    import('../leads/components/create-lead-dialog/create-lead-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.CreateLeadDialogComponent, {
        width: '600px',
        maxWidth: '90vw',
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.loadData(); // Refresh dashboard data
        }
      });
    });
  }

  addNewContact(): void {
    import('../contacts/components/create-contact-dialog/create-contact-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.CreateContactDialogComponent, {
        width: '520px',
        maxWidth: '90vw',
      });

      dialogRef.afterClosed().subscribe((created) => {
        if (created) {
          this.loadData(); // Refresh dashboard data
        }
      });
    });
  }

  createNewDeal(): void {
    import('../deals/components/deal-form.component/deal-form.component').then(
      (m) => {
        const dialogRef = this.dialog.open(m.DealFormComponent, {
          width: '700px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: { mode: 'create' },
          disableClose: false,
        });

        dialogRef.afterClosed().subscribe((created) => {
          if (created) {
            this.loadData();
          }
        });
      }
    );
  }

  sendEmail(): void {
    // TODO: Implement email functionality
    console.log('Send email action - to be implemented');
  }
}
