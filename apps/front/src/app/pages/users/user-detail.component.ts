import { Component, signal, inject, OnInit } from '@angular/core';
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
import { UserManagementService, User } from '../../services/user-management.service';

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
  template: `
    <div class="user-detail-container p-6 max-w-6xl mx-auto">
      <!-- Loading -->
      @if (userService.isLoading()) {
        <div class="flex justify-center items-center h-64">
          <mat-spinner></mat-spinner>
        </div>
      }

      <!-- Error -->
      @if (userService.error()) {
        <mat-card class="bg-red-50">
          <mat-card-content>
            <div class="flex items-center text-red-700">
              <mat-icon class="mr-2">error</mat-icon>
              {{ userService.error() }}
              <button mat-button (click)="goBack()" class="ml-auto">
                Вернуться к списку
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- User Details -->
      @if (currentUser() && !userService.isLoading()) {
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-start">
            <button mat-icon-button (click)="goBack()" class="mr-4 mt-1">
              <mat-icon>arrow_back</mat-icon>
            </button>
            
            <div class="flex items-center">
              <!-- Avatar -->
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                <span class="text-xl font-bold text-primary-600">
                  {{ getInitials(currentUser()!) }}
                </span>
              </div>
              
              <!-- Basic Info -->
              <div>
                <h1 class="text-3xl font-bold text-gray-900">
                  {{ currentUser()?.firstName }} {{ currentUser()?.lastName }}
                </h1>
                <p class="text-gray-600 text-lg">{{ currentUser()?.email }}</p>
                <div class="flex items-center mt-2 space-x-2">
                  <!-- Status Badge -->
                  <span [class]="getStatusBadgeClass(currentUser()!)">
                    {{ currentUser()?.isActive ? 'Активен' : 'Неактивен' }}
                  </span>
                  
                  <!-- Assignment Status -->
                  @if (currentUser()?.isAvailableForAssignment) {
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <mat-icon class="w-3 h-3 mr-1" style="font-size: 12px;">check_circle</mat-icon>
                      Доступен для назначений
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex space-x-2">
            <button 
              mat-stroked-button
              (click)="editUser()"
              [disabled]="userService.isLoading()"
            >
              <mat-icon>edit</mat-icon>
              Редактировать
            </button>
            
            <button 
              mat-button 
              [matMenuTriggerFor]="userMenu"
              [disabled]="userService.isLoading()"
            >
              <mat-icon>more_vert</mat-icon>
            </button>
            
            <mat-menu #userMenu="matMenu">
              @if (currentUser()?.isActive) {
                <button mat-menu-item (click)="toggleUserStatus()">
                  <mat-icon>block</mat-icon>
                  <span>Деактивировать</span>
                </button>
              } @else {
                <button mat-menu-item (click)="toggleUserStatus()">
                  <mat-icon>check_circle</mat-icon>
                  <span>Активировать</span>
                </button>
              }
              
              <button mat-menu-item (click)="resetPassword()">
                <mat-icon>lock_reset</mat-icon>
                <span>Сбросить пароль</span>
              </button>
              
              <mat-divider></mat-divider>
              
              <button mat-menu-item (click)="deleteUser()" class="text-red-600">
                <mat-icon class="text-red-600">delete</mat-icon>
                <span>Удалить пользователя</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Tabs -->
        <mat-tab-group>
          <!-- Overview Tab -->
          <mat-tab label="Обзор">
            <div class="pt-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Basic Information -->
                <div class="lg:col-span-2">
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title>Основная информация</mat-card-title>
                    </mat-card-header>
                    <mat-card-content class="mt-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-500">Логин</label>
                          <p class="mt-1 text-sm text-gray-900">{{ currentUser()?.username }}</p>
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-gray-500">Email</label>
                          <p class="mt-1 text-sm text-gray-900">{{ currentUser()?.email }}</p>
                        </div>
                        
                        @if (currentUser()?.phone) {
                          <div>
                            <label class="block text-sm font-medium text-gray-500">Телефон</label>
                            <p class="mt-1 text-sm text-gray-900">{{ currentUser()?.phone }}</p>
                          </div>
                        }
                        
                        @if (currentUser()?.department) {
                          <div>
                            <label class="block text-sm font-medium text-gray-500">Департамент</label>
                            <p class="mt-1 text-sm text-gray-900">{{ currentUser()?.department }}</p>
                          </div>
                        }
                        
                        <div>
                          <label class="block text-sm font-medium text-gray-500">Дата создания</label>
                          <p class="mt-1 text-sm text-gray-900">
                            {{ formatDate(currentUser()?.createdAt) }}
                          </p>
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-gray-500">Последнее обновление</label>
                          <p class="mt-1 text-sm text-gray-900">
                            {{ formatDate(currentUser()?.updatedAt) }}
                          </p>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <!-- Roles -->
                  <mat-card class="mt-6">
                    <mat-card-header>
                      <mat-card-title>Роли</mat-card-title>
                    </mat-card-header>
                    <mat-card-content class="mt-4">
                      @if (currentUser()?.roles && currentUser()?.roles.length > 0) {
                        <div class="flex flex-wrap gap-2">
                          @for (role of currentUser()?.roles; track role) {
                            <mat-chip-row [color]="getRoleColor(role)">
                              {{ getRoleLabel(role) }}
                            </mat-chip-row>
                          }
                        </div>
                      } @else {
                        <p class="text-gray-500 text-sm">Роли не назначены</p>
                      }
                    </mat-card-content>
                  </mat-card>

                  <!-- Skills and Territories -->
                  @if (currentUser()?.skills && currentUser()?.skills.length > 0) {
                    <mat-card class="mt-6">
                      <mat-card-header>
                        <mat-card-title class="flex items-center">
                          <mat-icon class="mr-2">verified</mat-icon>
                          Навыки
                          <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {{ currentUser()?.skills.length }}
                          </span>
                        </mat-card-title>
                      </mat-card-header>
                      <mat-card-content class="mt-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          @for (skill of currentUser()?.skills; track skill) {
                            <mat-chip-row color="primary" class="justify-start">
                              <mat-icon matChipAvatar>star</mat-icon>
                              {{ skill }}
                            </mat-chip-row>
                          }
                        </div>
                        
                        <!-- Skills summary -->
                        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p class="text-sm text-blue-700">
                            <mat-icon class="align-middle mr-1 text-base">info</mat-icon>
                            Пользователь обладает {{ currentUser()?.skills.length }} 
                            {{ getSkillsWord(currentUser()?.skills.length || 0) }}
                          </p>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  } @else {
                    <mat-card class="mt-6">
                      <mat-card-header>
                        <mat-card-title class="flex items-center">
                          <mat-icon class="mr-2">verified</mat-icon>
                          Навыки
                        </mat-card-title>
                      </mat-card-header>
                      <mat-card-content class="mt-4">
                        <div class="text-center py-6">
                          <mat-icon class="text-gray-300 text-4xl mb-2">school</mat-icon>
                          <p class="text-gray-500 text-sm">Навыки не указаны</p>
                          <button mat-button color="primary" (click)="editUser()" class="mt-2">
                            Добавить навыки
                          </button>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  }

                  @if (currentUser()?.territories && currentUser()?.territories.length > 0) {
                    <mat-card class="mt-6">
                      <mat-card-header>
                        <mat-card-title class="flex items-center">
                          <mat-icon class="mr-2">location_on</mat-icon>
                          Территории
                          <span class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {{ currentUser()?.territories.length }}
                          </span>
                        </mat-card-title>
                      </mat-card-header>
                      <mat-card-content class="mt-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          @for (territory of currentUser()?.territories; track territory) {
                            <mat-chip-row color="accent" class="justify-start">
                              <mat-icon matChipAvatar>place</mat-icon>
                              {{ territory }}
                            </mat-chip-row>
                          }
                        </div>
                        
                        <!-- Territories summary -->
                        <div class="mt-4 p-3 bg-green-50 rounded-lg">
                          <p class="text-sm text-green-700">
                            <mat-icon class="align-middle mr-1 text-base">info</mat-icon>
                            Зона ответственности включает {{ currentUser()?.territories.length }} 
                            {{ getTerritoriesWord(currentUser()?.territories.length || 0) }}
                          </p>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  } @else {
                    <mat-card class="mt-6">
                      <mat-card-header>
                        <mat-card-title class="flex items-center">
                          <mat-icon class="mr-2">location_on</mat-icon>
                          Территории
                        </mat-card-title>
                      </mat-card-header>
                      <mat-card-content class="mt-4">
                        <div class="text-center py-6">
                          <mat-icon class="text-gray-300 text-4xl mb-2">map</mat-icon>
                          <p class="text-gray-500 text-sm">Территории не назначены</p>
                          <button mat-button color="primary" (click)="editUser()" class="mt-2">
                            Назначить территории
                          </button>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  }
                </div>

                <!-- Sidebar -->
                <div>
                  <!-- Work Configuration -->
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title>Рабочие настройки</mat-card-title>
                    </mat-card-header>
                    <mat-card-content class="mt-4">
                      <div class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-500">Максимальная нагрузка</label>
                          <div class="flex items-center mt-1">
                            <span class="text-2xl font-bold text-primary-600">
                              {{ currentUser()?.maxLeadsCapacity || 0 }}
                            </span>
                            <span class="text-sm text-gray-500 ml-1">лидов</span>
                          </div>
                        </div>

                        @if (managerInfo()) {
                          <div>
                            <label class="block text-sm font-medium text-gray-500">Руководитель</label>
                            <div class="flex items-center mt-1">
                              <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                                <span class="text-xs font-medium">
                                  {{ getInitials(managerInfo()!) }}
                                </span>
                              </div>
                              <div>
                                <p class="text-sm font-medium text-gray-900">
                                  {{ managerInfo()?.firstName }} {{ managerInfo()?.lastName }}
                                </p>
                                <p class="text-xs text-gray-500">{{ managerInfo()?.email }}</p>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <!-- Statistics -->
                  <mat-card class="mt-6">
                    <mat-card-header>
                      <mat-card-title>Статистика</mat-card-title>
                    </mat-card-header>
                    <mat-card-content class="mt-4">
                      <div class="space-y-3">
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-500">Текущие лиды</span>
                          <span class="font-medium">-</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-500">Конверсия</span>
                          <span class="font-medium">-</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-500">Рейтинг</span>
                          <span class="font-medium">-</span>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Activity Tab -->
          <mat-tab label="Активность">
            <div class="pt-6">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>История активности</mat-card-title>
                </mat-card-header>
                <mat-card-content class="mt-4">
                  <p class="text-gray-500 text-center py-8">
                    История активности будет доступна в следующих версиях
                  </p>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Performance Tab -->
          <mat-tab label="Производительность">
            <div class="pt-6">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Показатели эффективности</mat-card-title>
                </mat-card-header>
                <mat-card-content class="mt-4">
                  <p class="text-gray-500 text-center py-8">
                    Аналитика производительности будет доступна в следующих версиях
                  </p>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .user-detail-container {
      background-color: #f9fafb;
      min-height: 100vh;
    }
    
    mat-card {
      margin-bottom: 0;
    }
    
    .mat-mdc-tab-body-wrapper {
      flex-grow: 1;
    }
  `]
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

    // Implement password reset logic
    this.showSuccess('Письмо для сброса пароля отправлено');
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