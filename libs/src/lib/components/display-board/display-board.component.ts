import { Component, OnInit, OnDestroy, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoWebSocketService, StoOrder, DisplayFilters } from '../../services/sto-websocket.service';

@Component({
  selector: 'sto-display-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display-board.component.html',
  styleUrls: ['./display-board.component.scss']
})
export class DisplayBoardComponent implements OnInit, OnDestroy {
  // Service injection
  constructor(private stoWebSocketService: StoWebSocketService) {
    // Update time every second
    setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  // Inputs
  displayId = input<string>('demo-display-1');
  zones = input<string[]>([]);
  workTypes = input<string[]>([]);
  showBlocked = input<boolean>(false);
  maxOrders = input<number>(10);

  // Reactive state
  orders = computed(() => {
    const allOrders = this.stoWebSocketService.orders();
    const max = this.maxOrders();
    return allOrders.slice(0, max);
  });
  
  connected = computed(() => this.stoWebSocketService.connected());
  currentTime = signal(new Date());

  ngOnInit(): void {
    const filters: DisplayFilters = {
      zones: this.zones(),
      workTypes: this.workTypes(),
      showBlocked: this.showBlocked(),
    };

    this.stoWebSocketService.connect(this.displayId(), filters);
  }

  ngOnDestroy(): void {
    this.stoWebSocketService.disconnect();
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'WAITING': 'status-waiting',
      'IN_PROGRESS': 'status-in-progress',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'BLOCKED': 'status-blocked',
    };
    return statusMap[status] || '';
  }

  getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'WAITING': 'Ожидание',
      'IN_PROGRESS': 'В работе',
      'COMPLETED': 'Завершено',
      'CANCELLED': 'Отменено',
      'BLOCKED': 'Заблокировано',
    };
    return textMap[status] || status;
  }

  getPriorityClass(priority: string): string {
    const priorityMap: Record<string, string> = {
      'LOW': 'priority-low',
      'NORMAL': 'priority-normal',
      'HIGH': 'priority-high',
      'URGENT': 'priority-urgent',
    };
    return priorityMap[priority] || '';
  }

  refresh(): void {
    this.stoWebSocketService.requestQueueUpdate();
  }
}
