import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationBellComponent } from '../components/notification-bell/notification-bell.component';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  active?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NotificationBellComponent,
  ],
  template: `
    <aside class="sidebar">
      <!-- Header with Logo -->
      <div class="sidebar-header">
        <div class="logo">
          <mat-icon class="logo-icon">business</mat-icon>
          <span class="logo-text">CRM</span>
        </div>
        <div class="header-actions">
          <app-notification-bell></app-notification-bell>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li *ngFor="let item of menuItems" class="nav-item">
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-link"
              [matTooltip]="item.label"
              matTooltipPosition="right"
              (click)="setActiveItem(item)"
            >
              <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- User Profile Section -->
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-left">
            <div class="user-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <div class="user-info">
              <span class="user-name">{{ userName() || '—' }}</span>
              <span class="user-role">{{ userRole() }}</span>
            </div>
          </div>

          <div class="profile-actions">
            <button
              mat-icon-button
              class="settings-btn"
              [matTooltip]="'Settings'"
              matTooltipPosition="right"
              aria-label="Settings"
            >
              <mat-icon>settings</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 280px;
        height: 100vh;
        background: var(--surface-color);
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 0;
        top: 0;
        z-index: 1000;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
      }

      /* Header */
      .sidebar-header {
        padding: 24px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .logo-icon {
        color: #4f46e5;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .logo-text {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: -0.02em;
      }

      /* Navigation */
      .sidebar-nav {
        flex: 1;
        padding: 20px 0;
        overflow-y: auto;
      }

      .nav-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .nav-item {
        margin: 4px 16px;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 16px;
        color: #64748b;
        text-decoration: none;
        border-radius: 12px;
        transition: all 0.2s ease;
        position: relative;
        font-weight: 500;
        font-size: 15px;
      }

      .nav-link:hover {
        background: rgba(79, 70, 229, 0.08);
        color: #475569;
        transform: translateX(2px);
      }

      .nav-link.active {
        background: #4285f4;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
      }

      .nav-link.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 24px;
        background: #4285f4;
        border-radius: 0 2px 2px 0;
      }

      .nav-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .nav-label {
        font-weight: 500;
        letter-spacing: -0.01em;
      }

      /* Footer */
      .sidebar-footer {
        padding: 20px;
        border-top: 1px solid #e2e8f0;
      }

      .user-profile {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        background: rgba(79, 70, 229, 0.05);
        border-radius: 12px;
        margin-bottom: 12px;
        border: 1px solid rgba(79, 70, 229, 0.1);
      }

      .user-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .profile-actions {
        display: flex;
        align-items: center;
      }

      .user-avatar {
        width: 40px;
        height: 40px;
        background: var(--primary-color);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .user-avatar mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .user-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .user-name {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.2;
      }

      .user-role {
        font-size: 12px;
        color: #64748b;
        line-height: 1.2;
      }

      .settings-btn {
        width: 40px;
        height: 40px;
        background: rgba(79, 70, 229, 0.05);
        color: #64748b;
        border-radius: 10px;
        border: 1px solid rgba(79, 70, 229, 0.1);
      }

      .settings-btn:hover {
        background: rgba(79, 70, 229, 0.1);
        color: #475569;
      }

      /* Scrollbar */
      .sidebar-nav::-webkit-scrollbar {
        width: 4px;
      }

      .sidebar-nav::-webkit-scrollbar-track {
        background: transparent;
      }

      .sidebar-nav::-webkit-scrollbar-thumb {
        background: rgba(79, 70, 229, 0.2);
        border-radius: 2px;
      }

      .sidebar-nav::-webkit-scrollbar-thumb:hover {
        background: rgba(79, 70, 229, 0.3);
      }
    `,
  ],
})
export class SidebarComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  // Expose signals for template binding
  userName = this.auth.user;
  userRole = computed(() => {
    const data = this.auth.getUserData();
    // Use first role if available
    return data?.roles && data.roles.length > 0 ? data.roles[0] : '—';
  });

  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'people', label: 'Contacts', route: '/contacts' },
    { icon: 'trending_up', label: 'Leads', route: '/leads' },
    { icon: 'account_tree', label: 'Pipeline', route: '/pipeline' },
    { icon: 'handshake', label: 'Deals', route: '/deals' },
    { icon: 'task', label: 'Tasks', route: '/tasks' },
    { icon: 'phone', label: 'Calls', route: '/calls' },
    { icon: 'dialpad', label: 'IVR', route: '/ivr' },
    { icon: 'group', label: 'Users', route: '/users' },
    { icon: 'assessment', label: 'Reports', route: '/reports' },
    { icon: 'help_outline', label: 'Help', route: '/help' },
  ];

  setActiveItem(item: MenuItem) {
    // Reset all items
    this.menuItems.forEach((menuItem) => (menuItem.active = false));
    // Set clicked item as active
    item.active = true;
  }
}
