import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNativeDateModule } from '@angular/material/core';
import { DealsService } from '../../pipeline/deals.service';
import { 
  DealHistory, 
  DealHistoryFilters, 
  DealHistoryResponse, 
  DealChangeType 
} from '../../pipeline/dtos';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-deal-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatExpansionModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatNativeDateModule
  ],
  template: `
    <mat-card class="history-card">
      <mat-card-header>
        <div mat-card-avatar class="history-avatar">
          <mat-icon>history</mat-icon>
        </div>
        <mat-card-title>История изменений</mat-card-title>
        <mat-card-subtitle>
          Журнал всех изменений сделки
          <span class="total-count" *ngIf="totalCount > 0">({{ totalCount }} записей)</span>
        </mat-card-subtitle>
        
        <!-- Кнопка фильтров -->
        <div class="header-actions">
          <button 
            mat-icon-button 
            [class.filters-active]="hasActiveFilters()"
            (click)="showFilters = !showFilters"
            matTooltip="Фильтры">
            <mat-icon [matBadge]="getActiveFiltersCount()" 
                      [matBadgeHidden]="!hasActiveFilters()"
                      matBadgeColor="accent">
              filter_list
            </mat-icon>
          </button>
          
          <button 
            mat-icon-button 
            (click)="refreshHistory()"
            [disabled]="isLoading"
            matTooltip="Обновить">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <!-- Фильтры -->
      <mat-card-content *ngIf="showFilters" class="filters-section">
        <div class="filters-container">
          <div class="filter-row">
            <!-- Тип изменения -->
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Тип изменения</mat-label>
              <mat-select multiple [(value)]="filters.changeType">
                <mat-option *ngFor="let type of changeTypes" [value]="type.value">
                  <mat-icon>{{ type.icon }}</mat-icon>
                  {{ type.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Пользователь -->
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Пользователь</mat-label>
              <mat-input 
                [(ngModel)]="userFilter" 
                placeholder="Имя пользователя"
                (input)="onUserFilterChange()">
              </mat-input>
            </mat-form-field>
          </div>

          <div class="filter-row">
            <!-- Дата от -->
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Дата от</mat-label>
              <input 
                matInput 
                [matDatepicker]="fromPicker"
                [(ngModel)]="filters.dateFrom"
                (dateChange)="onFiltersChange()">
              <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>

            <!-- Дата до -->
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Дата до</mat-label>
              <input 
                matInput 
                [matDatepicker]="toPicker"
                [(ngModel)]="filters.dateTo"
                (dateChange)="onFiltersChange()">
              <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="filter-actions">
            <button mat-stroked-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Очистить фильтры
            </button>
            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>search</mat-icon>
              Применить
            </button>
          </div>
        </div>
      </mat-card-content>

      <!-- Загрузка -->
      <mat-card-content *ngIf="isLoading" class="loading-section">
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка истории изменений...</p>
        </div>
      </mat-card-content>

      <!-- История -->
      <mat-card-content *ngIf="!isLoading && history.length > 0" class="history-content">
        <div class="history-timeline">
          <div 
            *ngFor="let entry of history; trackBy: trackByEntryId" 
            class="history-entry"
            [class]="'change-type-' + entry.changeType">
            
            <div class="timeline-connector"></div>
            
            <div class="timeline-icon">
              <mat-icon [class]="'icon-' + entry.changeType">
                {{ getChangeTypeIcon(entry.changeType) }}
              </mat-icon>
            </div>

            <div class="timeline-content">
              <div class="entry-header">
                <div class="entry-title">
                  <span class="change-description">{{ entry.description || getChangeTypeDescription(entry.changeType) }}</span>
                  <mat-chip class="change-type-chip" [class]="'chip-' + entry.changeType">
                    {{ getChangeTypeLabel(entry.changeType) }}
                  </mat-chip>
                </div>
                
                <div class="entry-meta">
                  <span class="entry-user" *ngIf="entry.userName">
                    <mat-icon>person</mat-icon>
                    {{ entry.userName }}
                  </span>
                  <span class="entry-date">
                    <mat-icon>schedule</mat-icon>
                    {{ entry.createdAt | date:'dd.MM.yyyy HH:mm' }}
                  </span>
                </div>
              </div>

              <!-- Детали изменения -->
              <div class="entry-details" *ngIf="hasChangeDetails(entry)">
                <div class="field-change" *ngIf="entry.fieldName">
                  <span class="field-label">Поле:</span>
                  <span class="field-name">{{ getFieldLabel(entry.fieldName) }}</span>
                </div>

                <div class="value-change" *ngIf="entry.oldValue || entry.newValue">
                  <div class="value-row" *ngIf="entry.oldValue">
                    <span class="value-label old-value">Было:</span>
                    <span class="value-content old">{{ formatValue(entry.oldValue, entry.fieldName) }}</span>
                  </div>
                  <div class="value-row" *ngIf="entry.newValue">
                    <span class="value-label new-value">Стало:</span>
                    <span class="value-content new">{{ formatValue(entry.newValue, entry.fieldName) }}</span>
                  </div>
                </div>

                <!-- Метаданные -->
                <div class="metadata" *ngIf="entry.metadata && hasMetadata(entry.metadata)">
                  <mat-expansion-panel class="metadata-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>info_outline</mat-icon>
                        Дополнительная информация
                      </mat-panel-title>
                    </mat-expansion-panel-header>
                    
                    <div class="metadata-content">
                      <div 
                        *ngFor="let item of getMetadataItems(entry.metadata)" 
                        class="metadata-item">
                        <span class="metadata-key">{{ item.key }}:</span>
                        <span class="metadata-value">{{ item.value }}</span>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>

      <!-- Пустое состояние -->
      <mat-card-content *ngIf="!isLoading && history.length === 0" class="empty-state">
        <div class="empty-container">
          <mat-icon class="empty-icon">history_toggle_off</mat-icon>
          <h3>История изменений пуста</h3>
          <p *ngIf="hasActiveFilters()">
            Попробуйте изменить фильтры или очистить их для просмотра всей истории.
          </p>
          <p *ngIf="!hasActiveFilters()">
            Изменения сделки будут отображаться здесь по мере их внесения.
          </p>
          
          <div class="empty-actions" *ngIf="hasActiveFilters()">
            <button mat-stroked-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Очистить фильтры
            </button>
          </div>
        </div>
      </mat-card-content>

      <!-- Пагинация -->
      <mat-card-actions *ngIf="!isLoading && totalCount > pageSize" class="pagination-section">
        <mat-paginator
          [length]="totalCount"
          [pageSize]="pageSize"
          [pageIndex]="currentPage - 1"
          [pageSizeOptions]="[10, 25, 50, 100]"
          (page)="onPageChange($event)"
          showFirstLastButtons>
        </mat-paginator>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrls: ['./deal-history.component.scss']
})
export class DealHistoryComponent implements OnInit, OnChanges {
  @Input() dealId!: string;

  private readonly dealsService = inject(DealsService);
  private readonly currencyService = inject(CurrencyService);

  // Данные
  history: DealHistory[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 25;
  isLoading = false;
  error: string | null = null;

  // Фильтры
  showFilters = false;
  filters: DealHistoryFilters = {};
  userFilter = '';

  // Типы изменений для фильтра
  changeTypes = [
    { value: DealChangeType.CREATED, label: 'Создание', icon: 'add_circle' },
    { value: DealChangeType.UPDATED, label: 'Обновление', icon: 'edit' },
    { value: DealChangeType.STAGE_MOVED, label: 'Смена этапа', icon: 'timeline' },
    { value: DealChangeType.AMOUNT_CHANGED, label: 'Изменение суммы', icon: 'monetization_on' },
    { value: DealChangeType.PROBABILITY_CHANGED, label: 'Изменение вероятности', icon: 'trending_up' },
    { value: DealChangeType.WON, label: 'Выиграна', icon: 'emoji_events' },
    { value: DealChangeType.LOST, label: 'Проиграна', icon: 'cancel' },
    { value: DealChangeType.ASSIGNED, label: 'Назначение', icon: 'person_add' },
    { value: DealChangeType.CONTACT_LINKED, label: 'Привязка контакта', icon: 'person_pin' },
    { value: DealChangeType.COMPANY_LINKED, label: 'Привязка компании', icon: 'business' },
    { value: DealChangeType.LEAD_LINKED, label: 'Привязка лида', icon: 'person_search' },
    { value: DealChangeType.NOTE_ADDED, label: 'Добавление заметки', icon: 'note_add' },
    { value: DealChangeType.DATE_CHANGED, label: 'Изменение даты', icon: 'event' },
    { value: DealChangeType.STATUS_CHANGED, label: 'Изменение статуса', icon: 'flag' },
    { value: DealChangeType.REOPENED, label: 'Переоткрытие', icon: 'refresh' },
    { value: DealChangeType.DELETED, label: 'Удаление', icon: 'delete' }
  ];

  ngOnInit() {
    if (this.dealId) {
      this.loadHistory();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dealId'] && changes['dealId'].currentValue) {
      this.loadHistory();
    }
  }

  loadHistory() {
    if (!this.dealId) return;

    this.isLoading = true;
    this.error = null;

    this.dealsService.getDealHistory(this.dealId, this.filters, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: DealHistoryResponse) => {
          this.history = response.history;
          this.totalCount = response.total;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки истории:', error);
          this.error = 'Не удалось загрузить историю изменений';
          this.isLoading = false;
        }
      });
  }

  refreshHistory() {
    this.currentPage = 1;
    this.loadHistory();
  }

  // === Фильтры ===
  hasActiveFilters(): boolean {
    return !!(
      this.filters.changeType?.length ||
      this.filters.userId?.length ||
      this.filters.fieldName?.length ||
      this.filters.dateFrom ||
      this.filters.dateTo
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filters.changeType?.length) count++;
    if (this.filters.userId?.length) count++;
    if (this.filters.fieldName?.length) count++;
    if (this.filters.dateFrom) count++;
    if (this.filters.dateTo) count++;
    return count;
  }

  onUserFilterChange() {
    if (this.userFilter) {
      this.filters.userId = [this.userFilter];
    } else {
      delete this.filters.userId;
    }
  }

  onFiltersChange() {
    // Автоматическое применение фильтров при изменении дат
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadHistory();
  }

  clearFilters() {
    this.filters = {};
    this.userFilter = '';
    this.applyFilters();
  }

  // === Пагинация ===
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadHistory();
  }

  // === Отображение ===
  trackByEntryId(index: number, entry: DealHistory): number {
    return entry.id;
  }

  getChangeTypeIcon(changeType: DealChangeType): string {
    const typeConfig = this.changeTypes.find(t => t.value === changeType);
    return typeConfig?.icon || 'edit';
  }

  getChangeTypeLabel(changeType: DealChangeType): string {
    const typeConfig = this.changeTypes.find(t => t.value === changeType);
    return typeConfig?.label || changeType;
  }

  getChangeTypeDescription(changeType: DealChangeType): string {
    const descriptions: Record<DealChangeType, string> = {
      [DealChangeType.CREATED]: 'Сделка создана',
      [DealChangeType.UPDATED]: 'Данные сделки обновлены',
      [DealChangeType.STAGE_MOVED]: 'Сделка перемещена на другой этап',
      [DealChangeType.AMOUNT_CHANGED]: 'Изменена сумма сделки',
      [DealChangeType.PROBABILITY_CHANGED]: 'Изменена вероятность закрытия',
      [DealChangeType.WON]: 'Сделка отмечена как выигранная',
      [DealChangeType.LOST]: 'Сделка отмечена как проигранная',
      [DealChangeType.ASSIGNED]: 'Сделка назначена менеджеру',
      [DealChangeType.CONTACT_LINKED]: 'К сделке привязан контакт',
      [DealChangeType.COMPANY_LINKED]: 'К сделке привязана компания',
      [DealChangeType.LEAD_LINKED]: 'К сделке привязан лид',
      [DealChangeType.NOTE_ADDED]: 'Добавлена заметка к сделке',
      [DealChangeType.DATE_CHANGED]: 'Изменены даты сделки',
      [DealChangeType.STATUS_CHANGED]: 'Изменен статус сделки',
      [DealChangeType.REOPENED]: 'Сделка переоткрыта',
      [DealChangeType.DELETED]: 'Сделка удалена'
    };

    return descriptions[changeType] || 'Изменение сделки';
  }

  hasChangeDetails(entry: DealHistory): boolean {
    return !!(entry.fieldName || entry.oldValue || entry.newValue || this.hasMetadata(entry.metadata));
  }

  getFieldLabel(fieldName: string): string {
    const fieldLabels: Record<string, string> = {
      'title': 'Название',
      'amount': 'Сумма',
      'currency': 'Валюта',
      'probability': 'Вероятность',
      'expectedCloseDate': 'Ожидаемая дата закрытия',
      'actualCloseDate': 'Фактическая дата закрытия',
      'stageId': 'Этап',
      'status': 'Статус',
      'assignedTo': 'Ответственный',
      'notes': 'Заметки',
      'contactId': 'Контакт',
      'companyId': 'Компания',
      'leadId': 'Лид'
    };

    return fieldLabels[fieldName] || fieldName;
  }

  formatValue(value: string, fieldName?: string): string {
    if (!value) return '';

    // Форматирование в зависимости от типа поля
    switch (fieldName) {
      case 'amount':
        return this.currencyService.formatAmount(Number(value));
      case 'probability':
        return value + '%';
      case 'expectedCloseDate':
      case 'actualCloseDate':
      case 'createdAt':
      case 'updatedAt':
        return new Date(value).toLocaleDateString('ru-RU');
      default:
        return value;
    }
  }

  hasMetadata(metadata: Record<string, unknown> | undefined): boolean {
    return !!(metadata && Object.keys(metadata).length > 0);
  }

  getMetadataItems(metadata: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(metadata).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  }
}