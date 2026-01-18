import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StoApiService, TrackingInfo } from '../../services/sto-api.service';
import { interval, switchMap } from 'rxjs';

@Component({
  selector: 'sto-tracking-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tracking-page.component.html',
  styleUrls: ['./tracking-page.component.scss']
})
export class TrackingPageComponent implements OnInit {
  orderId = signal<string>('');
  phone = signal<string>('');
  trackingInfo = signal<TrackingInfo | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  autoRefresh = signal(true);

  canCancel = computed(() => {
    const info = this.trackingInfo();
    return info?.canCancel || false;
  });

  statusText = computed(() => {
    const status = this.trackingInfo()?.status;
    const statusMap: Record<string, string> = {
      'WAITING': 'Ожидание',
      'IN_PROGRESS': 'В работе',
      'COMPLETED': 'Завершено',
      'CANCELLED': 'Отменено',
      'BLOCKED': 'Заблокировано',
    };
    return status ? statusMap[status] || status : '';
  });

  statusClass = computed(() => {
    const status = this.trackingInfo()?.status;
    const classMap: Record<string, string> = {
      'WAITING': 'waiting',
      'IN_PROGRESS': 'in-progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'BLOCKED': 'blocked',
    };
    return status ? classMap[status] || '' : '';
  });

  constructor(
    private route: ActivatedRoute,
    private apiService: StoApiService
  ) {}

  ngOnInit(): void {
    // Get orderId from URL params
    this.route.paramMap.subscribe(params => {
      const id = params.get('orderId');
      if (id) {
        this.orderId.set(id);
      }
    });

    // Get phone from query params
    this.route.queryParamMap.subscribe(params => {
      const phone = params.get('phone');
      if (phone) {
        this.phone.set(phone);
      }
    });

    // Auto-refresh every 10 seconds if enabled
    interval(10000)
      .pipe(
        switchMap(() => {
          if (this.autoRefresh() && this.orderId() && this.phone()) {
            return this.loadTrackingInfo();
          }
          return [];
        })
      )
      .subscribe();

    // Initial load
    if (this.orderId() && this.phone()) {
      this.loadTrackingInfo();
    }
  }

  loadTrackingInfo(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    return new Promise<void>((resolve) => {
      this.apiService.trackOrder(this.orderId(), this.phone()).subscribe({
        next: (data: TrackingInfo) => {
          this.trackingInfo.set(data);
          this.loading.set(false);
          resolve();
        },
        error: (err: any) => {
          this.error.set(err.error?.message || 'Не удалось загрузить информацию о заказе');
          this.loading.set(false);
          resolve();
        }
      });
    });
  }

  cancelOrder(): void {
    if (!confirm('Вы уверены, что хотите отменить заказ?')) {
      return;
    }

    this.loading.set(true);
    this.apiService.cancelOrder(this.orderId(), this.phone()).subscribe({
      next: () => {
        alert('Заказ успешно отменён');
        this.loadTrackingInfo();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Не удалось отменить заказ');
        this.loading.set(false);
      }
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
  }
}
