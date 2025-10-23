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
  route?: string;
  active?: boolean;
  expanded?: boolean;
  children?: MenuItem[];
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
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
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
    {
      icon: 'contact_support',
      label: 'Контакт центр',
      expanded: false,
      children: [
        { icon: 'visibility', label: 'онлайн мониторинг', route: '/contact-center/monitoring' },
        { icon: 'dialpad', label: 'ivr', route: '/contact-center/ivr' },
      ],
    },
    { icon: 'group', label: 'Users', route: '/users' },
    { icon: 'assessment', label: 'Reports', route: '/reports' },
    { icon: 'help_outline', label: 'Help', route: '/help' },
  ];

  toggleExpand(item: MenuItem) {
    item.expanded = !item.expanded;
  }

  setActiveItem(item: MenuItem) {
    // Reset all items
    this.menuItems.forEach((menuItem) => (menuItem.active = false));
    // Set clicked item as active
    item.active = true;
  }

  isChildRouteActive(item: MenuItem) {
    if (!item.children || item.children.length === 0) return false;
    const current = this.router.url;
    return item.children.some((c) => current.startsWith(c.route || ''));
  }
}
