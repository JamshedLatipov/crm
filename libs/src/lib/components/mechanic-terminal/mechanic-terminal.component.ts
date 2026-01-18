import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoApiService } from '../../services/sto-api.service';
import { StoOrder } from '../../services/sto-websocket.service';
import { interval } from 'rxjs';

interface Mechanic {
  id: string;
  name: string;
  pinCode: string;
}

@Component({
  selector: 'sto-mechanic-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mechanic-terminal.component.html',
  styleUrls: ['./mechanic-terminal.component.scss']
})
export class MechanicTerminalComponent implements OnInit {
  // Authentication state
  authenticated = signal(false);
  pinInput = signal('');
  currentMechanic = signal<Mechanic | null>(null);

  // Orders state
  availableOrders = signal<StoOrder[]>([]);
  myOrders = signal<StoOrder[]>([]);
  selectedZone = signal<string>('ALL');
  loading = signal(false);
  error = signal<string | null>(null);

  // Timer for IN_PROGRESS orders
  orderTimers = signal<Map<string, number>>(new Map());

  // Computed values
  filteredAvailable = computed(() => {
    const orders = this.availableOrders();
    const zone = this.selectedZone();
    
    if (zone === 'ALL') {
      return orders;
    }
    
    return orders.filter(order => order.zone === zone);
  });

  availableZones = computed(() => {
    const orders = this.availableOrders();
    const zones = new Set(orders.map(order => order.zone));
    return ['ALL', ...Array.from(zones).sort()];
  });

  constructor(private apiService: StoApiService) {}

  ngOnInit(): void {
    // Update timers every second
    interval(1000).subscribe(() => {
      this.updateTimers();
    });

    // Auto-refresh orders every 30 seconds if authenticated
    interval(30000).subscribe(() => {
      if (this.authenticated()) {
        this.loadOrders();
      }
    });
  }

  /**
   * PIN Authentication
   */
  login(): void {
    const pin = this.pinInput();
    
    if (pin.length < 4) {
      this.error.set('PIN должен содержать минимум 4 цифры');
      return;
    }

    // Mock authentication - in real app, call API
    const mockMechanics: Mechanic[] = [
      { id: 'mech-001', name: 'Иван Петров', pinCode: '1234' },
      { id: 'mech-002', name: 'Сергей Иванов', pinCode: '5678' },
      { id: 'mech-003', name: 'Алексей Смирнов', pinCode: '9999' },
    ];

    const mechanic = mockMechanics.find(m => m.pinCode === pin);

    if (mechanic) {
      this.currentMechanic.set(mechanic);
      this.authenticated.set(true);
      this.pinInput.set('');
      this.error.set(null);
      this.loadOrders();
    } else {
      this.error.set('Неверный PIN-код');
      setTimeout(() => this.error.set(null), 3000);
    }
  }

  logout(): void {
    this.authenticated.set(false);
    this.currentMechanic.set(null);
    this.availableOrders.set([]);
    this.myOrders.set([]);
    this.pinInput.set('');
  }

  /**
   * Load orders from API
   */
  loadOrders(): void {
    this.loading.set(true);
    
    // Load available orders (WAITING)
    this.apiService.getOrders({ status: 'waiting' }).subscribe({
      next: (orders) => {
        this.availableOrders.set(orders);
      },
      error: (err) => {
        console.error('Failed to load available orders', err);
      }
    });

    // Load my orders (IN_PROGRESS assigned to this mechanic)
    const mechanicId = this.currentMechanic()?.id;
    if (mechanicId) {
      this.apiService.getOrders({ status: 'in_progress' }).subscribe({
        next: (orders) => {
          const myOrders = orders.filter(o => o.mechanicId === mechanicId);
          this.myOrders.set(myOrders);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load my orders', err);
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  /**
   * Take an available order
   */
  takeOrder(order: StoOrder): void {
    const mechanicId = this.currentMechanic()?.id;
    if (!mechanicId) return;

    this.loading.set(true);
    
    this.apiService.updateOrderStatus(order.id, 'IN_PROGRESS', mechanicId).subscribe({
      next: (updatedOrder) => {
        // Remove from available
        this.availableOrders.set(
          this.availableOrders().filter(o => o.id !== order.id)
        );
        
        // Add to my orders
        this.myOrders.set([updatedOrder, ...this.myOrders()]);
        
        // Start timer
        this.startTimer(updatedOrder.id);
        
        this.loading.set(false);
      },
      error: (err) => {
        alert('Не удалось взять заказ: ' + (err.error?.message || 'Ошибка'));
        this.loading.set(false);
      }
    });
  }

  /**
   * Complete an order
   */
  completeOrder(order: StoOrder): void {
    if (!confirm('Завершить работу с этим заказом?')) {
      return;
    }

    this.loading.set(true);
    
    this.apiService.updateOrderStatus(order.id, 'COMPLETED').subscribe({
      next: () => {
        // Remove from my orders
        this.myOrders.set(
          this.myOrders().filter(o => o.id !== order.id)
        );
        
        // Stop timer
        this.stopTimer(order.id);
        
        this.loading.set(false);
        alert('Заказ успешно завершен!');
      },
      error: (err) => {
        alert('Не удалось завершить заказ: ' + (err.error?.message || 'Ошибка'));
        this.loading.set(false);
      }
    });
  }

  /**
   * Block an order
   */
  blockOrder(order: StoOrder): void {
    const reason = prompt('Укажите причину блокировки:');
    if (!reason) return;

    this.loading.set(true);
    
    this.apiService.updateOrderStatus(order.id, 'BLOCKED').subscribe({
      next: () => {
        // Remove from my orders
        this.myOrders.set(
          this.myOrders().filter(o => o.id !== order.id)
        );
        
        // Stop timer
        this.stopTimer(order.id);
        
        this.loading.set(false);
        alert('Заказ заблокирован');
      },
      error: (err) => {
        alert('Не удалось заблокировать заказ: ' + (err.error?.message || 'Ошибка'));
        this.loading.set(false);
      }
    });
  }

  /**
   * Timer management
   */
  private startTimer(orderId: string): void {
    const timers = this.orderTimers();
    timers.set(orderId, 0);
    this.orderTimers.set(new Map(timers));
  }

  private stopTimer(orderId: string): void {
    const timers = this.orderTimers();
    timers.delete(orderId);
    this.orderTimers.set(new Map(timers));
  }

  private updateTimers(): void {
    const timers = this.orderTimers();
    let updated = false;

    timers.forEach((seconds, orderId) => {
      timers.set(orderId, seconds + 1);
      updated = true;
    });

    if (updated) {
      this.orderTimers.set(new Map(timers));
    }
  }

  getTimerDisplay(orderId: string): string {
    const seconds = this.orderTimers().get(orderId) || 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get priority display
   */
  getPriorityBadgeClass(priority: string): string {
    const map: Record<string, string> = {
      'LOW': 'priority-low',
      'NORMAL': 'priority-normal',
      'HIGH': 'priority-high',
      'URGENT': 'priority-urgent',
    };
    return map[priority] || 'priority-normal';
  }
}
