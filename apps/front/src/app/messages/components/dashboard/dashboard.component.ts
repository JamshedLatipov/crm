import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { NotificationService } from '../../services/notification.service';
import { DashboardStats } from '../../models/message.models';

@Component({
  selector: 'app-messages-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PageLayoutComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  loading = signal(true);
  stats = signal<DashboardStats>({
    total: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    deliveryRate: 0
  });

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading.set(true);
    
    this.notificationService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.loading.set(false);
      }
    });
  }
}
