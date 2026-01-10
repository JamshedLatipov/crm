import { Component, signal, computed, inject, OnInit, effect, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './softphone-call-history.component.html',
  styleUrls: ['./softphone-call-history.component.scss']
})
export class SoftphoneCallHistoryComponent implements OnInit {
  private readonly historyService = inject(SoftphoneCallHistoryService);
  private readonly logger = inject(SoftphoneLoggerService);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Input properties using new API
  operatorId = input<string | null>(null);
  
  // Output events
  callRequested = output<string>();
  callDetailsRequested = output<CdrRecord>();

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

  // API base URL
  private readonly apiBase = environment.apiBase || '/api';

  // Computed properties
  stats = computed(() => {
    const callList = this.calls();
    const totalAnswered = callList.filter(call => call.disposition === 'ANSWERED').length;
    const totalMissed = callList.filter(call => 
      call.disposition === 'NO ANSWER' || 
      call.disposition === 'BUSY' || 
      call.disposition === 'FAILED'
    ).length;
    const totalCalls = callList.length;

    return {
      totalAnswered,
      totalMissed,
      totalCalls
    };
  });

  queryParams = computed((): CdrQuery => ({
    page: this.currentPage(),
    limit: this.pageSize(),
    fromDate: this.startDate?.toISOString(),
    toDate: this.endDate?.toISOString(),
    search: this.searchQuery() || undefined,
    operatorId: this.operatorId() || undefined
  }));

  constructor() {
    // Watch for operatorId changes
    effect(() => {
      const opId = this.operatorId();
      if (opId !== null) {
        this.currentPage.set(1);
        this.loadCallHistory();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.startDate = startOfToday();
    this.endDate = endOfToday();
    this.loadCallHistory();
  }

  async loadCallHistory(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const response = await this.historyService.list(this.apiBase, this.queryParams()).toPromise();
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
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить историю звонков';
      this.error.set(errorMessage);
      this.logger.error('Error loading call history:', err);
      this.snackBar.open(errorMessage, 'Закрыть', { duration: 5000 });
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
    this.startDate = startOfToday();
    this.endDate = endOfToday();
    this.currentPage.set(1);
    this.loadCallHistory();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage.set(event.pageIndex + 1); // Convert from 0-based to 1-based
    this.pageSize.set(event.pageSize);
    this.loadCallHistory();
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalRecords());
    return `${start}-${end} из ${this.totalRecords()}`;
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
    const isIncoming = this.isIncomingCall(call);
    return isIncoming ? 'direction-indicator direction-incoming' : 'direction-indicator direction-outgoing';
  }

  getDirectionIcon(call: CdrRecord): string {
    const isIncoming = this.isIncomingCall(call);
    
    // Check if call was answered
    if (call.disposition === 'ANSWERED') {
      return isIncoming ? 'call_received' : 'call_made';
    } else {
      return isIncoming ? 'call_missed' : 'call_missed_outgoing';
    }
  }

  getDirectionLabel(call: CdrRecord): string {
    const isIncoming = this.isIncomingCall(call);
    return isIncoming ? 'Входящий' : 'Исходящий';
  }

  /**
   * Determine if the call is incoming based on CDR fields
   * In Asterisk CDR:
   * - src: source number (caller)
   * - dst: destination number (callee)
   * For incoming calls to the operator: src is external, dst is internal extension
   * For outgoing calls from operator: src is internal extension, dst is external
   */
  private isIncomingCall(call: CdrRecord): boolean {
    // Check if source looks like external number (longer, contains +, or starts with common patterns)
    const src = call.src || '';
    const dst = call.dst || '';
    
    // If dst is shorter and numeric (likely internal extension), it's incoming
    if (dst.length <= 4 && /^\d+$/.test(dst) && src.length > 4) {
      return true;
    }
    
    // If src starts with + or 00 (international format), it's likely incoming
    if (src.startsWith('+') || src.startsWith('00')) {
      return true;
    }
    
    // If src is longer than dst, assume incoming
    if (src.length > dst.length) {
      return true;
    }
    
    return false;
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
    this.logger.info('Requesting call to number:', number);
    this.callRequested.emit(number);
  }

  showCallDetails(call: CdrRecord): void {
    this.logger.info('Requesting call details:', call);
    this.callDetailsRequested.emit(call);
  }
}
