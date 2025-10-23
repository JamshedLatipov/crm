import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { AdsService } from '../../services/ads.service';
import { AdsStateService } from '../../services/ads-state.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
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

          <button mat-icon-button [matBadge]="accounts.length" matBadgeColor="primary" [matMenuTriggerFor]="accountsMenu" class="profile-btn">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #accountsMenu="matMenu">
            <ng-container *ngIf="accounts.length; else noAccounts">
              <button mat-menu-item *ngFor="let a of accounts" (click)="unlink(a)">{{ a.name || a.accountId }} <span style="margin-left:8px; font-size:12px; color:#666">(unlink)</span></button>
            </ng-container>
            <ng-template #noAccounts>
              <button mat-menu-item disabled>No connected accounts</button>
            </ng-template>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="goToAccounts()">Manage accounts</button>
          </mat-menu>
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
export class HeaderComponent implements OnInit {
  accounts: any[] = [];
  subs: Subscription[] = [];
  constructor(private ads: AdsService, private adsState: AdsStateService, private router: Router, private dialog: MatDialog, private snack: MatSnackBar) {}
  ngOnInit(): void {
    this.subs.push(this.adsState.accounts$.subscribe(a => this.accounts = a || []));
  }
  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
  async unlink(a: any) {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: { title: 'Unlink account', message: `Unlink ${a.name||a.accountId}?` } });
    const ok = await ref.afterClosed().toPromise();
    if (!ok) return;
    this.ads.unlinkAccount(a.id).subscribe({
      next: () => { this.snack.open('Account unlinked', 'OK', { duration: 3000 }); this.adsState.notifyChanged(); },
      error: (err) => { this.snack.open('Failed to unlink', 'OK', { duration: 4000 }); console.error(err); }
    });
  }
  refreshTokens() {
    this.ads.refreshFacebookTokens().subscribe(r => {
      if (r.success) { this.snack.open('Tokens refreshed', 'OK', { duration: 3000 }); this.adsState.notifyChanged(); }
    }, () => this.snack.open('Refresh failed', 'OK', { duration: 3000 }));
  }
  goToAccounts() { this.router.navigate(['/ads', 'accounts']); }
}