import { Component, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
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
  private routerEventsSub?: Subscription;

  // Expose signals for template binding
  userName = this.auth.user;
  userRole = computed(() => {
    const data = this.auth.getUserData();
    // Use first role if available
    return data?.roles && data.roles.length > 0 ? data.roles[0] : '—';
  });

  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Дашборд', route: '/dashboard' },
    { icon: 'people', label: 'Контакты', route: '/contacts' },
    { icon: 'trending_up', label: 'Лиды', route: '/leads' },
    { icon: 'account_tree', label: 'Воронка', route: '/pipeline' },
    { icon: 'handshake', label: 'Сделки', route: '/deals' },
    { icon: 'business', label: 'Промо-компании', route: '/promo-companies' },
    // { icon: 'campaign', label: 'Рекламные аккаунты', route: '/ads/accounts' },
    { icon: 'task', label: 'Задачи', route: '/tasks' },
    {
      icon: 'contact_support',
      label: 'Контакт центр',
      expanded: false,
      children: [
        {
          icon: 'visibility',
          label: 'Онлайн мониторинг',
          route: '/contact-center/monitoring',
        },
        { icon: 'call', label: 'Звонки', route: '/contact-center/calls' },
        { icon: 'dialpad', label: 'IVR', route: '/contact-center/ivr' },
        {
          icon: 'description',
          label: 'Скрипты звонков',
          route: '/contact-center/scripts',
        },
      ],
    },
    { icon: 'group', label: 'Пользователи', route: '/users' },
    {
      icon: 'assessment',
      label: 'Отчеты',
      expanded: false,
      children: [
        {
          icon: 'insights',
          label: 'Источники звонков',
          route: '/reports/contact-center/sources',
        },
        {
          icon: 'people_alt',
          label: 'Отчёт операторов',
          route: '/reports/contact-center/operators',
        },
        {
          icon: 'queue',
          label: 'Отчёт по службам',
          route: '/reports/contact-center/queues',
        },
      ],
    },
    {
      icon: 'integration_instructions',
      label: 'Интеграции',
      expanded: false,
      children: [
        {
          icon: 'integration_instructions',
          label: 'Список интеграций',
          route: '/integrations',
        },
        {
          icon: 'person_search',
          label: 'Поиск клиента',
          route: '/client-info',
        },
      ],
    },
    { icon: 'help_outline', label: 'Помощь', route: '/help' },
  ];

  constructor() {
    // ensure parent items expand when a child route is active
    this.updateExpandedForActiveRoute();
    // subscribe to navigation end events so expansion follows route changes
    this.routerEventsSub = this.router.events.subscribe((ev: any) => {
      if (ev instanceof NavigationEnd) {
        this.updateExpandedForActiveRoute();
      }
    });
  }

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

  updateExpandedForActiveRoute() {
    this.menuItems.forEach((item) => {
      if (item.children && item.children.length) {
        // expand if any child route matches current url
        item.expanded = this.isChildRouteActive(item) || !!item.expanded;
      }
    });
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
