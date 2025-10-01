import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    NotificationBellComponent
  ],
  template: `
    <mat-toolbar class="app-header">
      <div class="header-content">
        <!-- Left section with title or breadcrumbs -->
        <div class="header-left">
          <h1 class="page-title">CRM Dashboard</h1>
        </div>

        <!-- Right section with actions -->
        <div class="header-right">
          <app-notification-bell></app-notification-bell>
          
          <button mat-icon-button class="profile-btn">
            <mat-icon>account_circle</mat-icon>
          </button>
        </div>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .app-header {
      background: #ffffff;
      color: #333;
      border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: #1e293b;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .profile-btn {
      margin-left: 8px;
    }

    .profile-btn mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
  `]
})
export class HeaderComponent {}