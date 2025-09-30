import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { DealsService } from '../../pipeline/deals.service';
import { 
  DealHistoryStats, 
  UserActivityStats, 
  StageMovementStats, 
  MostActiveDeal
} from '../../pipeline/dtos';

@Component({
  selector: 'app-deal-history-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="stats-card">
      <mat-card-header>
        <div mat-card-avatar class="stats-avatar">
          <mat-icon>analytics</mat-icon>
        </div>
        <mat-card-title>Аналитика истории сделки</mat-card-title>
        <mat-card-subtitle>Статистика изменений и активности</mat-card-subtitle>
        
        <div class="header-actions">
          <button 
            mat-icon-button 
            (click)="refreshStats()"
            [disabled]="isLoading"
            matTooltip="Обновить статистику">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Загрузка -->
        <div *ngIf="isLoading" class="loading-section">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка статистики...</p>
        </div>

        <!-- Контент -->
        <div *ngIf="!isLoading" class="stats-content">
          <mat-tab-group>
            <!-- Общая статистика -->
            <mat-tab label="Общая статистика">
              <div class="tab-content">
                <div class="stats-grid" *ngIf="dealStats">
                  <!-- Основные метрики -->
                  <div class="stat-card primary-stat">
                    <div class="stat-icon">
                      <mat-icon>trending_up</mat-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ getTotalChanges() }}</div>
                      <div class="stat-label">Всего изменений</div>
                    </div>
                  </div>

                  <div class="stat-card">
                    <div class="stat-icon update">
                      <mat-icon>edit</mat-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dealStats['updated'] || 0 }}</div>
                      <div class="stat-label">Обновлений</div>
                    </div>
                  </div>

                  <div class="stat-card">
                    <div class="stat-icon stage">
                      <mat-icon>timeline</mat-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dealStats['stage_moved'] || 0 }}</div>
                      <div class="stat-label">Смен этапов</div>
                    </div>
                  </div>

                  <div class="stat-card">
                    <div class="stat-icon amount">
                      <mat-icon>monetization_on</mat-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dealStats['amount_changed'] || 0 }}</div>
                      <div class="stat-label">Изменений суммы</div>
                    </div>
                  </div>
                </div>

                <!-- Детальная статистика -->
                <div class="detailed-stats" *ngIf="dealStats">
                  <h4>Детальная статистика по типам изменений</h4>
                  
                  <div class="stats-list">
                    <div 
                      *ngFor="let item of getDetailedStats()" 
                      class="stats-item"
                      [class]="'type-' + item.type">
                      
                      <div class="item-icon">
                        <mat-icon>{{ item.icon }}</mat-icon>
                      </div>
                      
                      <div class="item-content">
                        <div class="item-label">{{ item.label }}</div>
                        <div class="item-description">{{ item.description }}</div>
                      </div>
                      
                      <div class="item-value">
                        <span class="value">{{ item.count }}</span>
                        <div class="progress-bar">
                          <div 
                            class="progress-fill" 
                            [style.width.%]="item.percentage">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Пустое состояние для статистики -->
                <div *ngIf="!dealStats || getTotalChanges() === 0" class="empty-stats">
                  <mat-icon class="empty-icon">insert_chart_outlined</mat-icon>
                  <h4>Пока нет статистики</h4>
                  <p>Статистика появится после внесения изменений в сделку</p>
                </div>
              </div>
            </mat-tab>

            <!-- Активность пользователей -->
            <mat-tab label="Активность пользователей">
              <div class="tab-content">
                <div *ngIf="userActivity && userActivity.length > 0" class="user-activity-section">
                  <h4>Пользователи, изменявшие сделку</h4>
                  
                  <div class="activity-list">
                    <div 
                      *ngFor="let user of userActivity; trackBy: trackByUserId" 
                      class="activity-item">
                      
                      <div class="user-info">
                        <div class="user-avatar">
                          <mat-icon>account_circle</mat-icon>
                        </div>
                        <div class="user-details">
                          <div class="user-name">{{ user.userName || user.userId }}</div>
                          <div class="user-meta">
                            ID: {{ user.userId }}
                            <span *ngIf="user.lastActivity" class="last-activity">
                              • Последняя активность: {{ user.lastActivity | date:'dd.MM.yyyy HH:mm' }}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div class="activity-stats">
                        <mat-chip [class]="getActivityLevel(user.changesCount)">
                          {{ user.changesCount }} {{ getChangesLabel(user.changesCount) }}
                        </mat-chip>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="!userActivity || userActivity.length === 0" class="empty-activity">
                  <mat-icon class="empty-icon">people_outline</mat-icon>
                  <h4>Нет данных об активности</h4>
                  <p>Информация о пользователях появится после изменений сделки</p>
                </div>
              </div>
            </mat-tab>

            <!-- Движение по этапам -->
            <mat-tab label="Движение по этапам">
              <div class="tab-content">
                <div *ngIf="stageMovement && stageMovement.length > 0" class="stage-movement-section">
                  <h4>История перемещений между этапами</h4>
                  
                  <div class="movement-list">
                    <div 
                      *ngFor="let movement of stageMovement; trackBy: trackByMovement" 
                      class="movement-item">
                      
                      <div class="movement-flow">
                        <div class="stage-from">
                          <mat-icon>flag</mat-icon>
                          <span>{{ movement.fromStage || 'Начальный этап' }}</span>
                        </div>
                        
                        <div class="movement-arrow">
                          <mat-icon>arrow_forward</mat-icon>
                        </div>
                        
                        <div class="stage-to">
                          <mat-icon>flag</mat-icon>
                          <span>{{ movement.toStage || 'Конечный этап' }}</span>
                        </div>
                      </div>
                      
                      <div class="movement-count">
                        <mat-chip color="primary">
                          {{ movement.count }} {{ getMovementLabel(movement.count) }}
                        </mat-chip>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="!stageMovement || stageMovement.length === 0" class="empty-movement">
                  <mat-icon class="empty-icon">timeline</mat-icon>
                  <h4>Нет данных о перемещениях</h4>
                  <p>Информация о движении по этапам появится после изменения этапов сделки</p>
                </div>
              </div>
            </mat-tab>

            <!-- Глобальная статистика -->
            <mat-tab label="Общая активность">
              <div class="tab-content">
                <div *ngIf="globalStats" class="global-stats-section">
                  <h4>Статистика по всем сделкам</h4>
                  
                  <div class="global-grid">
                    <div class="global-stat">
                      <div class="global-icon">
                        <mat-icon>business_center</mat-icon>
                      </div>
                      <div class="global-content">
                        <div class="global-value">{{ globalStats['updated'] || 0 }}</div>
                        <div class="global-label">Обновлений по всем сделкам</div>
                      </div>
                    </div>
                    
                    <div class="global-stat">
                      <div class="global-icon">
                        <mat-icon>emoji_events</mat-icon>
                      </div>
                      <div class="global-content">
                        <div class="global-value">{{ globalStats['won'] || 0 }}</div>
                        <div class="global-label">Выигранных сделок</div>
                      </div>
                    </div>
                    
                    <div class="global-stat">
                      <div class="global-icon">
                        <mat-icon>cancel</mat-icon>
                      </div>
                      <div class="global-content">
                        <div class="global-value">{{ globalStats['lost'] || 0 }}</div>
                        <div class="global-label">Проигранных сделок</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Самые активные сделки -->
                <div *ngIf="mostActiveDeals && mostActiveDeals.length > 0" class="active-deals-section">
                  <h4>Самые активные сделки</h4>
                  
                  <div class="deals-list">
                    <div 
                      *ngFor="let deal of mostActiveDeals; trackBy: trackByDealId" 
                      class="deal-item">
                      
                      <div class="deal-info">
                        <div class="deal-title">
                          {{ deal.dealTitle || 'Сделка #' + deal.dealId }}
                        </div>
                        <div class="deal-meta">
                          ID: {{ deal.dealId }}
                          <span *ngIf="deal.lastChange" class="last-change">
                            • Последнее изменение: {{ deal.lastChange | date:'dd.MM.yyyy HH:mm' }}
                          </span>
                        </div>
                      </div>
                      
                      <div class="deal-activity">
                        <mat-chip [class]="getActivityLevel(deal.changesCount)">
                          {{ deal.changesCount }} {{ getChangesLabel(deal.changesCount) }}
                        </mat-chip>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="(!globalStats || getTotalGlobalChanges() === 0) && (!mostActiveDeals || mostActiveDeals.length === 0)" class="empty-global">
                  <mat-icon class="empty-icon">donut_large</mat-icon>
                  <h4>Нет глобальной статистики</h4>
                  <p>Общая статистика по системе недоступна</p>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./deal-history-stats.component.scss']
})
export class DealHistoryStatsComponent implements OnInit, OnChanges {
  @Input() dealId!: string;

  private readonly dealsService = inject(DealsService);

  // Данные
  dealStats: DealHistoryStats | null = null;
  userActivity: UserActivityStats[] = [];
  stageMovement: StageMovementStats[] = [];
  globalStats: DealHistoryStats | null = null;
  mostActiveDeals: MostActiveDeal[] = [];
  
  isLoading = false;
  error: string | null = null;

  ngOnInit() {
    if (this.dealId) {
      this.loadAllStats();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dealId'] && changes['dealId'].currentValue) {
      this.loadAllStats();
    }
  }

  loadAllStats() {
    this.isLoading = true;
    this.error = null;

    // Загружаем статистику конкретной сделки
    this.dealsService.getDealHistoryStats(this.dealId).subscribe({
      next: (stats) => {
        this.dealStats = stats;
      },
      error: (error) => {
        console.error('Ошибка загрузки статистики сделки:', error);
      }
    });

    // Загружаем активность пользователей
    this.dealsService.getUserActivity().subscribe({
      next: (activity) => {
        this.userActivity = activity;
      },
      error: (error) => {
        console.error('Ошибка загрузки активности пользователей:', error);
      }
    });

    // Загружаем статистику движения по этапам
    this.dealsService.getStageMovementStats().subscribe({
      next: (movement) => {
        this.stageMovement = movement;
      },
      error: (error) => {
        console.error('Ошибка загрузки статистики этапов:', error);
      }
    });

    // Загружаем глобальную статистику
    this.dealsService.getHistoryStats().subscribe({
      next: (stats) => {
        this.globalStats = stats;
      },
      error: (error) => {
        console.error('Ошибка загрузки глобальной статистики:', error);
      }
    });

    // Загружаем самые активные сделки
    this.dealsService.getMostActiveDeals().subscribe({
      next: (deals) => {
        this.mostActiveDeals = deals;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки активных сделок:', error);
        this.isLoading = false;
      }
    });
  }

  refreshStats() {
    this.loadAllStats();
  }

  // === Вычисления для статистики ===
  getTotalChanges(): number {
    if (!this.dealStats) return 0;
    return Object.values(this.dealStats).reduce((sum, count) => sum + (count || 0), 0);
  }

  getTotalGlobalChanges(): number {
    if (!this.globalStats) return 0;
    return Object.values(this.globalStats).reduce((sum, count) => sum + (count || 0), 0);
  }

  getDetailedStats(): Array<{
    type: string;
    label: string;
    description: string;
    icon: string;
    count: number;
    percentage: number;
  }> {
    if (!this.dealStats) return [];

    const total = this.getTotalChanges();
    if (total === 0) return [];

    const typeConfig: Record<string, { label: string; description: string; icon: string }> = {
      'created': { label: 'Создание', description: 'Первоначальное создание сделки', icon: 'add_circle' },
      'updated': { label: 'Обновления', description: 'Изменения основных данных', icon: 'edit' },
      'stage_moved': { label: 'Смены этапов', description: 'Перемещения по воронке продаж', icon: 'timeline' },
      'amount_changed': { label: 'Изменения суммы', description: 'Корректировки стоимости сделки', icon: 'monetization_on' },
      'probability_changed': { label: 'Изменения вероятности', description: 'Корректировки шансов закрытия', icon: 'trending_up' },
      'won': { label: 'Выигрыши', description: 'Успешное закрытие сделки', icon: 'emoji_events' },
      'lost': { label: 'Проигрыши', description: 'Неуспешное закрытие сделки', icon: 'cancel' },
      'assigned': { label: 'Назначения', description: 'Изменения ответственного менеджера', icon: 'person_add' },
      'contact_linked': { label: 'Привязки контактов', description: 'Связывание с контактными лицами', icon: 'person_pin' },
      'company_linked': { label: 'Привязки компаний', description: 'Связывание с организациями', icon: 'business' },
      'lead_linked': { label: 'Привязки лидов', description: 'Связывание с источниками', icon: 'person_search' },
      'note_added': { label: 'Добавления заметок', description: 'Внесение дополнительной информации', icon: 'note_add' },
      'date_changed': { label: 'Изменения дат', description: 'Корректировки временных рамок', icon: 'event' },
      'status_changed': { label: 'Изменения статуса', description: 'Смена состояния сделки', icon: 'flag' },
      'reopened': { label: 'Переоткрытия', description: 'Возобновление работы со сделкой', icon: 'refresh' }
    };

    return Object.entries(this.dealStats)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        label: typeConfig[type]?.label || type,
        description: typeConfig[type]?.description || '',
        icon: typeConfig[type]?.icon || 'edit',
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  // === Отображение ===
  trackByUserId(index: number, user: UserActivityStats): string {
    return user.userId;
  }

  trackByMovement(index: number, movement: StageMovementStats): string {
    return `${movement.fromStage}-${movement.toStage}`;
  }

  trackByDealId(index: number, deal: MostActiveDeal): string {
    return deal.dealId;
  }

  getActivityLevel(changesCount: number): string {
    if (changesCount >= 20) return 'high-activity';
    if (changesCount >= 10) return 'medium-activity';
    if (changesCount >= 5) return 'low-activity';
    return 'minimal-activity';
  }

  getChangesLabel(count: number): string {
    const remainder = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'изменений';
    }

    switch (remainder) {
      case 1:
        return 'изменение';
      case 2:
      case 3:
      case 4:
        return 'изменения';
      default:
        return 'изменений';
    }
  }

  getMovementLabel(count: number): string {
    const remainder = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'перемещений';
    }

    switch (remainder) {
      case 1:
        return 'перемещение';
      case 2:
      case 3:
      case 4:
        return 'перемещения';
      default:
        return 'перемещений';
    }
  }
}