import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { LeadService } from '../services/lead.service';
import { Lead } from '../models/lead.model';
import { UserService, Manager } from '../../shared/services/user.service';

interface ManagerStats {
  id: string;
  name: string;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  workload: 'low' | 'medium' | 'high' | 'overloaded';
}

@Component({
  selector: 'app-assignment-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  template: `
    <div class="assignment-stats">
      <h3>Статистика назначений</h3>
      
      <div class="stats-grid">
        <mat-card class="stat-card total">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon>people</mat-icon>
              <span class="stat-label">Всего лидов</span>
            </div>
            <div class="stat-value">{{ totalLeads }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card assigned">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon>person_add</mat-icon>
              <span class="stat-label">Назначено</span>
            </div>
            <div class="stat-value">{{ assignedLeads }}</div>
            <div class="stat-percentage">{{ assignedPercentage }}%</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card unassigned">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon>person_off</mat-icon>
              <span class="stat-label">Не назначено</span>
            </div>
            <div class="stat-value">{{ unassignedLeads }}</div>
            <div class="stat-percentage">{{ unassignedPercentage }}%</div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="managers-stats" *ngIf="managerStats.length > 0">
        <h4>Статистика по менеджерам</h4>
        <div class="managers-list">
          <mat-card *ngFor="let manager of managerStats" class="manager-card">
            <mat-card-content>
              <div class="manager-header">
                <div class="manager-info">
                  <div class="manager-name">{{ manager.name }}</div>
                  <mat-chip 
                    [class]="'workload-chip ' + manager.workload" 
                    selected
                  >
                    {{ getWorkloadLabel(manager.workload) }}
                  </mat-chip>
                </div>
                <div class="manager-leads">{{ manager.totalLeads }} лидов</div>
              </div>
              
              <div class="manager-metrics">
                <div class="metric">
                  <span class="metric-label">Квалифицировано:</span>
                  <span class="metric-value">{{ manager.qualifiedLeads }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Конвертировано:</span>
                  <span class="metric-value">{{ manager.convertedLeads }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Конверсия:</span>
                  <span class="metric-value">{{ manager.conversionRate }}%</span>
                </div>
              </div>

              <mat-progress-bar 
                [value]="manager.conversionRate" 
                mode="determinate"
                [color]="manager.conversionRate > 20 ? 'primary' : 'warn'"
              ></mat-progress-bar>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .assignment-stats {
      padding: 16px;
    }

    .assignment-stats h3 {
      margin: 0 0 16px;
      font-size: 1.125rem;
      font-weight: 500;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      text-align: center;
    }

    .stat-card.total {
      border-left: 4px solid #2196f3;
    }

    .stat-card.assigned {
      border-left: 4px solid #4caf50;
    }

    .stat-card.unassigned {
      border-left: 4px solid #ff9800;
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
      color: rgba(0, 0, 0, 0.6);
    }

    .stat-label {
      font-size: 0.875rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .stat-percentage {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .managers-stats h4 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 500;
    }

    .managers-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .manager-card {
      background: #fafafa;
    }

    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .manager-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .manager-leads {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .manager-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .metric-label {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 2px;
    }

    .metric-value {
      font-weight: 500;
    }

    .workload-chip {
      font-size: 0.75rem;
      min-height: 20px;
    }

    .workload-chip.low {
      background-color: #e8f5e8 !important;
      color: #2e7d32 !important;
    }

    .workload-chip.medium {
      background-color: #fff3e0 !important;
      color: #f57c00 !important;
    }

    .workload-chip.high {
      background-color: #ffebee !important;
      color: #d32f2f !important;
    }

    .workload-chip.overloaded {
      background-color: #fce4ec !important;
      color: #c2185b !important;
    }
  `]
})
export class AssignmentStatsComponent {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);

  totalLeads = 0;
  assignedLeads = 0;
  unassignedLeads = 0;
  assignedPercentage = 0;
  unassignedPercentage = 0;

  managerStats: ManagerStats[] = [];

  // Loaded managers
  private managers: Manager[] = [];

  private workloadLabels = {
    low: 'Низкая загрузка',
    medium: 'Средняя загрузка', 
    high: 'Высокая загрузка',
    overloaded: 'Перегружен'
  };

  constructor() {
    this.loadManagers();
    this.loadStats();
  }

  private loadManagers(): void {
    this.userService.getManagers().subscribe({
      next: (managers) => this.managers = managers,
      error: (err) => console.error('Error loading managers for stats:', err)
    });
  }

  loadStats(): void {
    // Загружаем всех лидов для анализа
    this.leadService.getLeads().subscribe({
      next: (response) => {
        this.analyzeLeads(response.leads);
      },
      error: (error) => {
        console.error('Error loading leads for stats:', error);
      }
    });
  }

  private analyzeLeads(leads: Lead[]): void {
    this.totalLeads = leads.length;
    this.assignedLeads = leads.filter(lead => lead.assignedTo).length;
    this.unassignedLeads = this.totalLeads - this.assignedLeads;
    
    this.assignedPercentage = this.totalLeads > 0 ? 
      Math.round((this.assignedLeads / this.totalLeads) * 100) : 0;
    this.unassignedPercentage = 100 - this.assignedPercentage;

    this.calculateManagerStats(leads);
  }

  private calculateManagerStats(leads: Lead[]): void {
    const managerMap = new Map<string, {
      total: number;
      qualified: number;
      converted: number;
    }>();

    // Группируем лиды по менеджерам
    leads.forEach(lead => {
      if (lead.assignedTo) {
        if (!managerMap.has(lead.assignedTo)) {
          managerMap.set(lead.assignedTo, { total: 0, qualified: 0, converted: 0 });
        }
        
        const stats = managerMap.get(lead.assignedTo);
        if (stats) {
          stats.total++;
          
          if (lead.qualified) {
            stats.qualified++;
          }
          
          if (lead.status === 'converted') {
            stats.converted++;
          }
        }
      }
    });

    // Преобразуем в массив статистики
    this.managerStats = Array.from(managerMap.entries()).map(([managerId, stats]) => {
      const conversionRate = stats.total > 0 ? 
        Math.round((stats.converted / stats.total) * 100) : 0;
      
      let workload: 'low' | 'medium' | 'high' | 'overloaded';
      if (stats.total <= 5) workload = 'low';
      else if (stats.total <= 10) workload = 'medium';
      else if (stats.total <= 15) workload = 'high';
      else workload = 'overloaded';

      const managerRecord = this.managers.find(m => m.id?.toString() === managerId.toString());
      return {
        id: managerId,
        name: managerRecord?.fullName || managerId, // Resolve to fullName when available
        totalLeads: stats.total,
        qualifiedLeads: stats.qualified,
        convertedLeads: stats.converted,
        conversionRate,
        workload
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }

  getWorkloadLabel(workload: string): string {
    return this.workloadLabels[workload as keyof typeof this.workloadLabels] || workload;
  }
}
