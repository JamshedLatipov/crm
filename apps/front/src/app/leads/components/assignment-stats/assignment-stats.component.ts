import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { LeadService } from '../../services/lead.service';
import { Lead } from '../../models/lead.model';
import { UserService, Manager } from '../../../shared/services/user.service';


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
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatChipsModule],
  templateUrl: './assignment-stats.component.html',
  styleUrls: ['./assignment-stats.component.scss']
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
    this.leadService.getLeads().subscribe({
      next: (response) => this.analyzeLeads(response.leads),
      error: (error) => console.error('Error loading leads for stats:', error)
    });
  }

  private analyzeLeads(leads: Lead[]): void {
    this.totalLeads = leads.length;
    this.assignedLeads = leads.filter(lead => lead.assignedTo).length;
    this.unassignedLeads = this.totalLeads - this.assignedLeads;
    this.assignedPercentage = this.totalLeads > 0 ? Math.round((this.assignedLeads / this.totalLeads) * 100) : 0;
    this.unassignedPercentage = 100 - this.assignedPercentage;
    this.calculateManagerStats(leads);
  }

  private calculateManagerStats(leads: Lead[]): void {
    const managerMap = new Map<string, { total: number; qualified: number; converted: number; }>();

    leads.forEach(lead => {
      if (lead.assignedTo) {
        if (!managerMap.has(lead.assignedTo)) {
          managerMap.set(lead.assignedTo, { total: 0, qualified: 0, converted: 0 });
        }
        const stats = managerMap.get(lead.assignedTo);
        if (stats) {
          stats.total++;
          if (lead.qualified) stats.qualified++;
          if (lead.status === 'converted') stats.converted++;
        }
      }
    });

    this.managerStats = Array.from(managerMap.entries()).map(([managerId, stats]) => {
      const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;
      let workload: 'low' | 'medium' | 'high' | 'overloaded';
      if (stats.total <= 5) workload = 'low';
      else if (stats.total <= 10) workload = 'medium';
      else if (stats.total <= 15) workload = 'high';
      else workload = 'overloaded';

      const managerRecord = this.managers.find(m => m.id?.toString() === managerId.toString());
      return {
        id: managerId,
        name: managerRecord?.fullName || managerId,
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
 
