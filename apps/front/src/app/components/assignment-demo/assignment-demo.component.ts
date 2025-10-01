import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AssignResponsibleComponent } from '../assign-responsible/assign-responsible.component';
import { AssignmentService, User } from '../../services/assignment.service';

@Component({
  selector: 'app-assignment-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    AssignResponsibleComponent
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Демо системы назначений</h1>
      
      <!-- Пример лида/сделки -->
      <mat-card class="mb-6">
        <mat-card-header>
          <mat-card-title>Лид #12345</mat-card-title>
          <mat-card-subtitle>Компания ABC Corp - Потенциальная сделка $50,000</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="flex flex-col gap-4">
            <!-- Текущие назначения -->
            <div>
              <h3 class="text-lg font-medium mb-2">Назначенные ответственные:</h3>
              @if (currentAssignees().length > 0) {
                <div class="flex flex-wrap gap-2">
                  @for (user of currentAssignees(); track user.id) {
                    <mat-chip-row>
                      <img 
                        [src]="user.avatar || 'https://i.pravatar.cc/32?img=' + user.id" 
                        [alt]="user.name"
                        class="w-6 h-6 rounded-full mr-2"
                      >
                      {{ user.name }}
                      <button matChipRemove (click)="removeAssignee(user.id)">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    </mat-chip-row>
                  }
                </div>
              } @else {
                <p class="text-gray-500">Никто не назначен</p>
              }
            </div>

            <!-- Компонент назначения -->
            <div>
              <h3 class="text-lg font-medium mb-2">Добавить ответственных:</h3>
              <app-assign-responsible
                entityType="lead"
                entityId="12345"
                (onAssign)="handleAssignment($event)"
                (onError)="handleError($event)"
              />
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Статистика -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Статистика назначений</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ totalAssignments() }}</div>
              <div class="text-sm text-gray-600">Всего назначений</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ activeUsers() }}</div>
              <div class="text-sm text-gray-600">Активных пользователей</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">{{ avgWorkload() }}%</div>
              <div class="text-sm text-gray-600">Средняя загрузка</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Debug info -->
      @if (showDebug()) {
        <mat-card class="mt-6">
          <mat-card-header>
            <mat-card-title>Debug Information</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            <pre class="text-xs bg-gray-100 p-4 rounded">{{ debugInfo() | json }}</pre>
          </mat-card-content>
        </mat-card>
      }

      <!-- Кнопка для показа/скрытия debug -->
      <div class="mt-4 text-center">
        <button 
          mat-stroked-button 
          (click)="toggleDebug()"
          color="primary"
        >
          {{ showDebug() ? 'Скрыть' : 'Показать' }} Debug
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .mat-chip-row {
      align-items: center;
    }
  `]
})
export class AssignmentDemoComponent {
  private readonly assignmentService = inject(AssignmentService);
  private readonly snackBar = inject(MatSnackBar);

  // Signals
  public readonly currentAssignees = signal<User[]>([]);
  public readonly totalAssignments = signal<number>(0);
  public readonly showDebug = signal<boolean>(false);

  // Computed values
  public readonly activeUsers = signal<number>(
    this.assignmentService.users().filter(u => u.isAvailable).length
  );

  public readonly avgWorkload = signal<number>(
    Math.round(
      this.assignmentService.users()
        .filter(u => u.isAvailable)
        .reduce((acc, u) => acc + u.workloadPercentage, 0) / 
      this.assignmentService.users().filter(u => u.isAvailable).length || 1
    )
  );

  public readonly debugInfo = signal<any>({
    assignmentService: {
      usersCount: this.assignmentService.users().length,
      isLoading: this.assignmentService.isLoading(),
      error: this.assignmentService.error()
    },
    currentAssignees: this.currentAssignees().length,
    demoEntity: {
      type: 'lead',
      id: '12345'
    }
  });

  constructor() {
    // Загружаем пользователей при инициализации
    this.assignmentService.loadUsers().subscribe();
    
    // Симулируем текущие назначения
    this.loadCurrentAssignments();
    
    // Обновляем статистику
    this.updateStatistics();
  }

  private loadCurrentAssignments(): void {
    // Имитируем загрузку текущих назначений
    this.assignmentService.getCurrentAssignments('lead', '12345').subscribe({
      next: (users) => {
        this.currentAssignees.set(users);
      },
      error: () => {
        // Fallback: добавляем одного пользователя для демо
        const users = this.assignmentService.users();
        if (users.length > 0) {
          this.currentAssignees.set([users[0]]);
        }
      }
    });
  }

  private updateStatistics(): void {
    const users = this.assignmentService.users();
    this.totalAssignments.set(users.reduce((acc, u) => acc + u.workload, 0));
    
    const activeCount = users.filter(u => u.isAvailable).length;
    this.activeUsers.set(activeCount);

    if (activeCount > 0) {
      const totalWorkload = users
        .filter(u => u.isAvailable)
        .reduce((acc, u) => acc + u.workloadPercentage, 0);
      this.avgWorkload.set(Math.round(totalWorkload / activeCount));
    }
  }

  public handleAssignment(event: any): void {
    console.log('Assignment event:', event);
    
    // Добавляем новых пользователей к текущим назначениям
    const current = this.currentAssignees();
    const newUsers = event.users?.filter((user: User) => 
      !current.some(c => c.id === user.id)
    ) || [];
    
    if (newUsers.length > 0) {
      this.currentAssignees.set([...current, ...newUsers]);
      
      this.snackBar.open(
        `Назначено ${newUsers.length} ответственных`, 
        'Закрыть', 
        { duration: 3000, panelClass: 'success-snackbar' }
      );
      
      // Обновляем статистику
      this.updateStatistics();
    }
  }

  public handleError(error: any): void {
    console.error('Assignment error:', error);
    const errorMessage = typeof error === 'string' ? error : 'Ошибка при назначении ответственных';
    this.snackBar.open(
      errorMessage, 
      'Закрыть', 
      { duration: 5000, panelClass: 'error-snackbar' }
    );
  }

  public removeAssignee(userId: number): void {
    const current = this.currentAssignees();
    const filtered = current.filter(user => user.id !== userId);
    this.currentAssignees.set(filtered);
    
    this.snackBar.open(
      'Ответственный удален', 
      'Закрыть', 
      { duration: 2000 }
    );
    
    // Обновляем статистику
    this.updateStatistics();
  }

  public toggleDebug(): void {
    this.showDebug.set(!this.showDebug());
    
    // Обновляем debug info
    this.debugInfo.set({
      assignmentService: {
        usersCount: this.assignmentService.users().length,
        isLoading: this.assignmentService.isLoading(),
        error: this.assignmentService.error()
      },
      currentAssignees: this.currentAssignees().length,
      demoEntity: {
        type: 'lead',
        id: '12345'
      },
      timestamp: new Date().toISOString()
    });
  }
}