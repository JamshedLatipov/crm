import { Component, signal, computed, inject, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { SoftphoneCallHistoryService } from '../../services/softphone-call-history.service';
import { SoftphoneLoggerService } from '../../softphone-logger.service';
import { CdrRecord, CdrQuery, CdrResponse } from '../../types/cdr.types';
import { environment } from '../../../../environments/environment';
import { endOfToday, startOfToday } from 'date-fns';

@Component({
  selector: 'app-softphone-call-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './softphone-call-history.component.html',
  styleUrls: ['./softphone-call-history.component.scss']
})
export class SoftphoneCallHistoryComponent implements OnInit, OnChanges {
  private historyService = inject(SoftphoneCallHistoryService);
  private readonly logger = inject(SoftphoneLoggerService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Input properties
  @Input() operatorId: string | null = null;

  // State signals
  calls = signal<CdrRecord[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  totalRecords = signal(0);
  pageSize = signal(20);

  // Date filters
  startDate: Date | null = null;
  endDate: Date | null = null;
  today = new Date();

  // API base URL
  apiBase = signal(environment.apiBase || '/api');

  // Computed properties
  stats = computed(() => {
    const callList = this.calls();
    const totalAnswered = callList.filter(call => call.disposition === 'ANSWERED').length;
    const totalMissed = callList.filter(call => call.disposition === 'NO ANSWER' || call.disposition === 'BUSY').length;
    const totalCalls = callList.length;

    return {
      totalAnswered,
      totalMissed,
      totalCalls
    };
  });

  filteredCalls = computed(() => {
    let filtered = this.calls();

    // Apply search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(call =>
        (call.src || '').toLowerCase().includes(query) ||
        (call.dst || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  queryParams = computed((): CdrQuery => ({
    page: this.currentPage(),
    limit: this.pageSize(),
    fromDate: this.startDate?.toISOString(),
    toDate: this.endDate?.toISOString(),
    search: this.searchQuery() || undefined,
    operatorId: this.operatorId || undefined
  }));

  ngOnInit(): void {
    this.startDate = startOfToday();
    this.endDate = endOfToday();
    this.loadCallHistory();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operatorId'] && !changes['operatorId'].firstChange) {
      this.currentPage.set(1);
      this.loadCallHistory();
    }
  }

  async loadCallHistory(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const response = await this.historyService.list(this.apiBase(), this.queryParams()).toPromise();
      if (response) {
        this.calls.set(response.data);
        this.totalRecords.set(response.total);
        this.totalPages.set(Math.ceil(response.total / this.pageSize()));

        // Update paginator if it exists
        if (this.paginator) {
          this.paginator.length = response.total;
          this.paginator.pageIndex = this.currentPage() - 1; // MatPaginator uses 0-based indexing
        }
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Не удалось загрузить историю звонков');
      this.logger.error('Error loading call history:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  refreshHistory(): void {
    this.loadCallHistory();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadCallHistory();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadCallHistory();
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadCallHistory();
  }

  onPageChange(event: any): void {
    this.currentPage.set(event.pageIndex + 1); // Convert from 0-based to 1-based
    this.pageSize.set(event.pageSize);
    this.loadCallHistory();
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalRecords());
    return `${start}-${end} of ${this.totalRecords()}`;
  }

  trackByCallId(index: number, call: CdrRecord): string {
    return call.uniqueid || `${call.calldate}-${call.src}-${call.dst}-${index}`;
  }

  getCallNotes(call: CdrRecord): string {
    return call.userfield || '';
  }

  isRecentCall(call: CdrRecord): boolean {
    const callDate = new Date(call.calldate);
    const now = new Date();
    const diffMs = now.getTime() - callDate.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= 5;
  }

  formatCallTime(calldate: string): string {
    return new Date(calldate).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatCallDate(calldate: string): string {
    const date = new Date(calldate);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Сегодня';
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('ru-RU', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  getDirectionClass(call: CdrRecord): string {
    // Simple heuristic: if src is shorter or contains numbers, it's likely an incoming call
    const isIncoming = (call.src?.length || 0) < (call.dst?.length || 0) || /^\d+$/.test(call.src || '');
    return isIncoming ? 'direction-indicator direction-incoming' : 'direction-indicator direction-outgoing';
  }

  getDirectionIcon(call: CdrRecord): string {
    const isIncoming = (call.src?.length || 0) < (call.dst?.length || 0) || /^\d+$/.test(call.src || '');
    return isIncoming ? 'call_received' : 'call_made';
  }

  getDirectionLabel(call: CdrRecord): string {
    const isIncoming = (call.src?.length || 0) < (call.dst?.length || 0) || /^\d+$/.test(call.src || '');
    return isIncoming ? 'Входящий' : 'Исходящий';
  }

  getDispositionClass(call: CdrRecord): string {
    switch (call.disposition) {
      case 'ANSWERED':
        return 'disposition-badge disposition-answered';
      case 'NO ANSWER':
        return 'disposition-badge disposition-no-answer';
      case 'BUSY':
        return 'disposition-badge disposition-busy';
      case 'FAILED':
        return 'disposition-badge disposition-failed';
      default:
        return 'disposition-badge disposition-failed';
    }
  }

  getDispositionIcon(call: CdrRecord): string {
    switch (call.disposition) {
      case 'ANSWERED':
        return 'check_circle';
      case 'NO ANSWER':
        return 'call_missed';
      case 'BUSY':
        return 'call_missed_outgoing';
      case 'FAILED':
        return 'error';
      default:
        return 'info';
    }
  }

  getDispositionLabel(call: CdrRecord): string {
    switch (call.disposition) {
      case 'ANSWERED':
        return 'Отвечен';
      case 'NO ANSWER':
        return 'Без ответа';
      case 'BUSY':
        return 'Занято';
      case 'FAILED':
        return 'Ошибка';
      default:
        return call.disposition;
    }
  }

  formatDuration(duration: number): string {
    if (!duration || duration === 0) {
      return '00:00';
    }

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  callNumber(number: string): void {
    // Emit event to parent component to initiate call
    this.logger.info('Calling number:', number);
    // TODO: Implement call functionality - emit event to softphone
    // For now, just log the action
    alert(`Звонок на номер ${number}...`);
  }

  showCallDetails(call: CdrRecord): void {
    // Show detailed call information in a modal or expanded view
    this.logger.info('Call details:', call);

    const details = `
Детали звонка:
- Дата/Время: ${new Date(call.calldate).toLocaleString('ru-RU')}
- Направление: ${this.getDirectionLabel(call)}
- Номер: ${call.src || call.dst}
- Статус: ${this.getDispositionLabel(call)}
- Длительность: ${this.formatDuration(call.duration)}
- Оплачено: ${call.billsec} сек.
- Канал: ${call.channel}
- Канал назначения: ${call.dstchannel}
- Контекст: ${call.dcontext}
- Уникальный ID: ${call.uniqueid}
${call.userfield ? `- Заметки: ${call.userfield}` : ''}
    `.trim();

    alert(details);
  }
}
