import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <p class="subtitle">Welcome to your CRM dashboard</p>
      </div>

      <div class="dashboard-grid">
        <!-- Stats Cards -->
        <mat-card class="stat-card leads">
          <div class="stat-content">
            <div class="stat-info">
              <h3>245</h3>
              <p>Active Leads</p>
            </div>
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="stat-change positive">+12% this week</div>
        </mat-card>

        <mat-card class="stat-card deals">
          <div class="stat-content">
            <div class="stat-info">
              <h3>89</h3>
              <p>Active Deals</p>
            </div>
            <div class="stat-icon">
              <mat-icon>handshake</mat-icon>
            </div>
          </div>
          <div class="stat-change positive">+8% this week</div>
        </mat-card>

        <mat-card class="stat-card contacts">
          <div class="stat-content">
            <div class="stat-info">
              <h3>1,234</h3>
              <p>Total Contacts</p>
            </div>
            <div class="stat-icon">
              <mat-icon>people</mat-icon>
            </div>
          </div>
          <div class="stat-change neutral">+2% this week</div>
        </mat-card>

        <mat-card class="stat-card revenue">
          <div class="stat-content">
            <div class="stat-info">
              <h3>$124K</h3>
              <p>Revenue</p>
            </div>
            <div class="stat-icon">
              <mat-icon>attach_money</mat-icon>
            </div>
          </div>
          <div class="stat-change positive">+15% this week</div>
        </mat-card>

        <!-- Recent Activity -->
        <mat-card class="activity-card">
          <div class="card-header">
            <h2>Recent Activity</h2>
            <button mat-button>View All</button>
          </div>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon leads">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="activity-content">
                <p><strong>New lead</strong> from website</p>
                <span class="activity-time">2 minutes ago</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon deals">
                <mat-icon>handshake</mat-icon>
              </div>
              <div class="activity-content">
                <p><strong>Deal closed</strong> - $25,000</p>
                <span class="activity-time">1 hour ago</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon contacts">
                <mat-icon>people</mat-icon>
              </div>
              <div class="activity-content">
                <p><strong>Contact updated</strong> - John Smith</p>
                <span class="activity-time">3 hours ago</span>
              </div>
            </div>
          </div>
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
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
      border-radius: 12px;
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
      grid-column: span 2;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
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

    /* Quick Actions */
    .quick-actions-card {
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
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

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      
      .activity-card {
        grid-column: span 1;
      }
    }
  `]
})
export class DashboardComponent {
}
