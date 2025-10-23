import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdsService } from '../services/ads.service';
import { AdsStateService } from '../services/ads-state.service';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span>CRM System</span>
      
      <div class="nav-spacer"></div>
      
      <nav class="nav-menu">
        <button mat-button routerLink="/leads" routerLinkActive="active">
          <mat-icon>people</mat-icon>
          Лиды
        </button>
        
        <button mat-button routerLink="/softphone" routerLinkActive="active">
          <mat-icon>phone</mat-icon>
          Софтфон
        </button>
        
        <button mat-button routerLink="/ivr" routerLinkActive="active">
          <mat-icon>settings_phone</mat-icon>
          IVR
        </button>
        
        <button mat-button routerLink="/ads" routerLinkActive="active" [matBadge]="accountsCount" matBadgeColor="accent" [matBadgeHidden]="accountsCount===0" matTooltip="Advertising campaigns">
          <mat-icon>bar_chart</mat-icon>
          Реклама
        </button>
      </nav>
      
      <div class="nav-spacer"></div>
      
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          Выйти
        </button>
        <button mat-menu-item (click)="navigateToAdsAccounts()">
          <mat-icon>account_box</mat-icon>
          Рекламные аккаунты
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .nav-spacer {
      flex: 1 1 auto;
    }
    
    .nav-menu {
      display: flex;
      gap: 8px;
    }
    
    .nav-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .nav-menu button.active {
      background-color: rgba(255, 255, 255, 0.1);
    }
  `]
})
export class NavigationComponent implements OnDestroy {
  accountsCount = 0;
  subs: Subscription[] = [];
  constructor(private authService: AuthService, private router: Router, private adsService: AdsService, private adsState: AdsStateService) {
    // subscribe to centralized ads state for live updates
    this.subs.push(
      this.adsState.accounts$.subscribe(accounts => { this.accountsCount = accounts ? accounts.length : 0; })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToAdsAccounts() {
    this.router.navigate(['/ads', 'accounts']);
  }
}
