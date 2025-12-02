import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdsService } from '../../services/ads.service';
import { AdsStateService } from '../../services/ads-state.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { ConfirmActionDialogComponent } from '../../shared/dialogs/confirm-action-dialog.component';
import { formatDistanceToNow } from 'date-fns';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-ads-accounts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatDialogModule,
    // use the new ConfirmActionDialogComponent for richer confirmations
    ConfirmActionDialogComponent,
  ],
  template: `
    <div class="p-4">
      <div
        class="ads-header"
        style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px"
      >
        <h2 style="margin:0">Рекламные аккаунты</h2>
        <div style="display:flex; gap:8px; align-items:center">
          <button mat-stroked-button color="primary" (click)="startOAuth()">
            Подключить Facebook
          </button>
          <button mat-stroked-button (click)="refreshAll()">
            Обновить токены
          </button>
          <button mat-stroked-button color="accent" (click)="seed()">
            Seed (dev)
          </button>
          <button
            mat-stroked-button
            (click)="bulkRefreshSelected()"
            [disabled]="selectedAccounts.length === 0"
          >
            Обновить выбранные
          </button>
          <button
            mat-stroked-button
            color="warn"
            (click)="bulkUnlinkSelected()"
            [disabled]="selectedAccounts.length === 0"
          >
            Отвязать выбранные
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Загрузка аккаунтов...</div>

      <div *ngIf="!loading && paginatedAccounts.length === 0" class="empty">
        <p>Нет подключённых рекламных аккаунтов</p>
        <p>
          <button mat-flat-button color="primary" (click)="startOAuth()">
            Подключить аккаунт
          </button>
        </p>
      </div>

      <table
        mat-table
        [dataSource]="paginatedAccounts"
        class="mat-elevation-z1"
        role="grid"
      >
        <!-- Select -->
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef>
            <mat-checkbox
              [checked]="isAllSelected()"
              [indeterminate]="isPartiallySelected()"
              (change)="toggleAllSelection()"
              aria-label="Выбрать все"
            ></mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let a">
            <mat-checkbox
              (change)="toggleAccountSelection(a)"
              [checked]="isAccountSelected(a)"
              aria-label="Выбрать аккаунт"
            ></mat-checkbox>
          </td>
        </ng-container>

        <!-- Account ID -->
        <ng-container matColumnDef="accountId">
          <th mat-header-cell *matHeaderCellDef>Account ID</th>
          <td mat-cell *matCellDef="let a">{{ a.accountId }}</td>
        </ng-container>

        <!-- Name -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Имя</th>
          <td mat-cell *matCellDef="let a">
            <div style="display:flex; align-items:center; gap:12px">
              <div
                aria-hidden
                style="width:36px; height:36px; border-radius:6px; background:rgba(47,120,255,0.08); display:flex; align-items:center; justify-content:center; font-weight:700"
              >
                {{ (a.name || a.accountId).charAt(0) }}
              </div>
              <div>{{ a.name || a.accountId }}</div>
            </div>
          </td>
        </ng-container>

        <!-- Expires -->
        <ng-container matColumnDef="expires">
          <th mat-header-cell *matHeaderCellDef>Статус токена</th>
          <td mat-cell *matCellDef="let a">
            <span
              class="expiry"
              [class.expired]="isExpired(a.tokenExpiresAt)"
              [class.valid]="isValid(a.tokenExpiresAt)"
              >{{ expiryText(a.tokenExpiresAt) }}</span
            >
          </td>
        </ng-container>

        <!-- Actions -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let a" class="actions-cell">
            <button
              mat-icon-button
              matTooltip="Обновить"
              (click)="refreshAccount(a)"
              aria-label="Обновить аккаунт"
            >
              <mat-icon>autorenew</mat-icon>
            </button>
            <button
              mat-icon-button
              matTooltip="Отвязать"
              (click)="onUnlink(a)"
              aria-label="Отвязать аккаунт"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns"
          (click)="onRowClicked(row)"
          role="button"
          tabindex="0"
          (keydown.enter)="onRowClicked(row)"
          (keydown.space)="onRowClicked(row)"
        ></tr>
      </table>

      <div class="table-footer" *ngIf="accounts.length > 0">
        <mat-paginator
          [length]="accounts.length"
          [pageSize]="pageSize"
          [pageIndex]="currentPage"
          [pageSizeOptions]="[5, 10, 25]"
          (page)="onPageChange($event)"
        ></mat-paginator>
      </div>
    </div>
  `,
})
export class AdsAccountsComponent implements OnInit, OnDestroy {
  accounts: any[] = [];
  subs: Subscription[] = [];
  // table / pagination state
  displayedColumns = ['select', 'accountId', 'name', 'expires', 'actions'];
  paginatedAccounts: any[] = [];
  loading = false;
  pageSize = 10;
  currentPage = 0;
  selectedAccounts: any[] = [];

  constructor(
    private ads: AdsService,
    private adsState: AdsStateService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.adsState.accounts$.subscribe((a) => {
        this.accounts = a || [];
        this.updatePagination();
      })
    );
  }
  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
  startOAuth() {
    window.location.href = '/api/ads/facebook/oauth/start';
  }
  refreshAll() {
    this.ads.refreshFacebookTokens().subscribe(
      (r) => {
        if (r.success) {
          this.snack.open('Tokens refreshed', 'OK', { duration: 3000 });
          this.adsState.notifyChanged();
        }
      },
      (err) => {
        console.error(err);
        this.snack.open('Refresh failed', 'OK', { duration: 3000 });
      }
    );
  }
  seed() {
    this.ads.seedAds().subscribe(
      (r) => {
        if (r.success) {
          this.snack.open('Seed applied', 'OK', { duration: 3000 });
          this.adsState.notifyChanged();
        }
      },
      (err) => {
        console.error(err);
        this.snack.open('Seed failed', 'OK', { duration: 3000 });
      }
    );
  }
  expiryText(val: string | Date | null) {
    if (!val) return '—';
    try {
      return formatDistanceToNow(new Date(val), { addSuffix: true });
    } catch {
      return String(val);
    }
  }
  onUnlink(a: any) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Unlink account',
        message: `Unlink ${a.name || a.accountId}?`,
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.ads.unlinkAccount(a.id).subscribe(
        () => {
          this.snack.open('Account unlinked', 'OK', { duration: 3000 });
          this.adsState.notifyChanged();
        },
        (err) => {
          console.error(err);
          this.snack.open('Failed to unlink', 'OK', { duration: 3000 });
        }
      );
    });
  }

  // per-account manual refresh
  refreshAccount(a: any) {
    this.ads.refreshAccount(a.id).subscribe({
      next: () => {
        this.snack.open('Account refreshed', 'OK', { duration: 3000 });
        this.adsState.notifyChanged();
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Refresh failed', 'OK', { duration: 3000 });
      },
    });
  }

  onRowClicked(row: any) {
    // open a simple actions dialog: ask to unlink or refresh
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Account actions',
        message: `Refresh or unlink ${
          row.name || row.accountId
        }? Press OK to unlink, Cancel to refresh.`,
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.onUnlink(row);
      } else {
        this.refreshAccount(row);
      }
    });
  }

  // bulk actions
  bulkRefreshSelected() {
    const ids = this.selectedAccounts.map((a) => a.id);
    ids.forEach((id) => {
      this.ads
        .refreshAccount(id)
        .subscribe({ next: () => {}, error: () => {} });
    });
    this.snack.open('Обновление запущено для выбранных аккаунтов', 'OK', {
      duration: 3000,
    });
    this.adsState.notifyChanged();
    this.selectedAccounts = [];
    this.updatePagination();
  }

  bulkUnlinkSelected() {
    const ids = this.selectedAccounts.map((a) => a.id);
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Отвязать аккаунты',
        message: `Отвязать ${ids.length} аккаунтов?`,
        confirmText: 'Отвязать',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      ids.forEach((id) => {
        this.ads.unlinkAccount(id).subscribe({ next: () => {}, error: () => {} });
      });
      this.snack.open('Удаление запущено для выбранных аккаунтов', 'OK', {
        duration: 3000,
      });
      this.adsState.notifyChanged();
      this.selectedAccounts = [];
      this.updatePagination();
    });
    this.snack.open('Удаление запущено для выбранных аккаунтов', 'OK', {
      duration: 3000,
    });
    this.adsState.notifyChanged();
    this.selectedAccounts = [];
    this.updatePagination();
  }

  // pagination helpers
  updatePagination() {
    const start = this.currentPage * this.pageSize;
    this.paginatedAccounts = this.accounts
      ? this.accounts.slice(start, start + this.pageSize)
      : [];
  }

  onPageChange(e: PageEvent) {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.updatePagination();
  }

  // selection helpers
  toggleAccountSelection(a: any) {
    const idx = this.selectedAccounts.findIndex((x) => x.id === a.id);
    if (idx > -1) this.selectedAccounts.splice(idx, 1);
    else this.selectedAccounts.push(a);
  }

  isAccountSelected(a: any) {
    return this.selectedAccounts.some((x) => x.id === a.id);
  }

  toggleAllSelection() {
    if (this.isAllSelected()) this.selectedAccounts = [];
    else this.selectedAccounts = [...this.paginatedAccounts];
  }

  isAllSelected() {
    return (
      this.paginatedAccounts.length > 0 &&
      this.selectedAccounts.filter((u) =>
        this.paginatedAccounts.some((p) => p.id === u.id)
      ).length === this.paginatedAccounts.length
    );
  }

  isPartiallySelected() {
    const cnt = this.selectedAccounts.filter((u) =>
      this.paginatedAccounts.some((p) => p.id === u.id)
    ).length;
    return cnt > 0 && cnt < this.paginatedAccounts.length;
  }

  isExpired(val: string | Date | null): boolean {
    if (!val) return false;
    try {
      return new Date(val) < new Date();
    } catch {
      return false;
    }
  }

  isValid(val: string | Date | null): boolean {
    if (!val) return false;
    try {
      return new Date(val) > new Date();
    } catch {
      return false;
    }
  }
}
