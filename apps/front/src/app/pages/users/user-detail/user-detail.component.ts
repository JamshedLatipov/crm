import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { UserManagementService, User } from '../../../services/user-management.service';
import { PasswordResetSnackbarComponent } from '../../../shared/components/password-reset-snackbar/password-reset-snackbar.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailComponent implements OnInit {
  protected readonly userService = inject(UserManagementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Component state
  public readonly currentUser = signal<User | null>(null);
  public readonly managerInfo = signal<User | null>(null);

  private readonly roleLabels: Record<string, string> = {
    'admin': 'Администратор',
    'sales_manager': 'Менеджер продаж',
    'senior_manager': 'Старший менеджер',
    'team_lead': 'Руководитель команды',
    'account_manager': 'Менеджер аккаунтов',
    'client': 'Клиент'
  };

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(parseInt(userId));
    } else {
      this.goBack();
    }
  }

  // User actions
  editUser(): void {
    const userId = this.currentUser()?.id;
    if (userId) {
      this.router.navigate(['/users', userId, 'edit']);
    }
  }

  toggleUserStatus(): void {
    const user = this.currentUser();
    if (!user) return;

    const newStatus = !user.isActive;
    this.userService.updateUser(user.id, { isActive: newStatus }).subscribe({
      next: (updatedUser) => {
        this.currentUser.set(updatedUser);
        this.showSuccess(
          newStatus ? 'Пользователь активирован' : 'Пользователь деактивирован'
        );
      },
      error: () => {
        this.showError('Ошибка при изменении статуса пользователя');
      }
    });
  }

  resetPassword(): void {
    const user = this.currentUser();
    if (!user) return;

    this.userService.resetPassword(user.id).subscribe({
      next: (result) => {
        this.snackBar.openFromComponent(PasswordResetSnackbarComponent, {
          data: { password: result.temporaryPassword },
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: () => {
        this.showError('Ошибка при сбросе пароля');
      }
    });
  }

  deleteUser(): void {
    const user = this.currentUser();
    if (!user) return;

    if (confirm(`Вы уверены, что хотите удалить пользователя ${user.firstName} ${user.lastName}?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showSuccess('Пользователь удален');
          this.goBack();
        },
        error: () => {
          this.showError('Ошибка при удалении пользователя');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  // Utility methods
  getInitials(user: User): string {
    const firstInitial = user.firstName?.charAt(0).toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial || user.username?.charAt(0).toUpperCase() || '?';
  }

  getStatusBadgeClass(user: User): string {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    return user.isActive
      ? `${baseClasses} bg-green-100 text-green-800`
      : `${baseClasses} bg-red-100 text-red-800`;
  }

  getRoleLabel(role: string): string {
    return this.roleLabels[role] || role;
  }

  getRoleColor(role: string): 'primary' | 'accent' | 'warn' {
    switch (role) {
      case 'admin':
        return 'warn';
      case 'senior_manager':
      case 'team_lead':
        return 'primary';
      default:
        return 'accent';
    }
  }

  formatDate(date?: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSkillsWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'навыками';
    }

    switch (lastDigit) {
      case 1:
        return 'навыком';
      case 2:
      case 3:
      case 4:
        return 'навыками';
      default:
        return 'навыками';
    }
  }

  getTerritoriesWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'территорий';
    }

    switch (lastDigit) {
      case 1:
        return 'территорию';
      case 2:
      case 3:
      case 4:
        return 'территории';
      default:
        return 'территорий';
    }
  }

  private loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        if (user) {
          this.currentUser.set(user);
          this.loadManagerInfo(user.managerID);
        } else {
          this.showError('Пользователь не найден');
          this.goBack();
        }
      },
      error: () => {
        this.showError('Ошибка при загрузке пользователя');
        this.goBack();
      }
    });
  }

  private loadManagerInfo(managerId?: number): void {
    if (!managerId) return;

    this.userService.getUserById(managerId).subscribe({
      next: (manager) => {
        this.managerInfo.set(manager);
      },
      error: () => {
        // Ignore manager loading errors
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Закрыть', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Закрыть', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}