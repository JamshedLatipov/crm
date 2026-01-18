import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';

export interface StoOrder {
  id: string;
  queueNumber: number;
  queueNumberInZone: number;
  zone: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  customerName: string;
  customerPhone: string;
  workType: string;
  workDescription: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  mechanicId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DisplayFilters {
  zones?: string[];
  workTypes?: string[];
  showBlocked?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StoWebSocketService {
  private socket: Socket | null = null;
  private readonly apiUrl = environment.stoApiUrl || 'http://localhost:3002';
  private mockDataInterval: any = null;

  // Signals for reactive state
  orders = signal<StoOrder[]>([]);
  connected = signal(false);
  displayId = signal<string | null>(null);

  private generateMockOrders(): StoOrder[] {
    const zones = ['A', 'B', 'C'];
    const statuses: Array<'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'> = 
      ['waiting', 'in_progress', 'completed'];
    const workTypes = ['maintenance', 'repair', 'diagnostics', 'tire-service'];
    const makes = ['Toyota', 'BMW', 'Mercedes', 'Honda', 'Nissan', 'Mazda'];
    const models = ['Camry', '3 Series', 'E-Class', 'Accord', 'Altima', 'CX-5'];
    const priorities: Array<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'> = ['NORMAL', 'HIGH', 'URGENT'];

    return Array.from({ length: 12 }, (_, i): StoOrder => ({
      id: `mock-order-${i + 1}`,
      queueNumber: i + 1,
      queueNumberInZone: Math.floor(i / 3) + 1,
      zone: zones[i % 3] as string,
      status: statuses[i % 3] as 'waiting' | 'in_progress' | 'completed',
      vehicleMake: makes[i % makes.length] as string,
      vehicleModel: models[i % models.length] as string,
      vehicleYear: 2018 + (i % 7),
      licensePlate: `A${(100 + i).toString().padStart(3, '0')}BC`,
      customerName: `Клиент ${i + 1}`,
      customerPhone: `+99299${(1000000 + i).toString()}`,
      workType: workTypes[i % workTypes.length] as string,
      workDescription: 'Плановое обслуживание',
      priority: priorities[i % priorities.length] as 'NORMAL' | 'HIGH' | 'URGENT',
      mechanicId: i % 3 === 1 ? 'mech-001' : undefined,
      createdAt: new Date(Date.now() - i * 300000).toISOString(),
      startedAt: i % 3 === 1 ? new Date(Date.now() - i * 150000).toISOString() : undefined,
    }));
  }

  connect(displayId: string, filters?: DisplayFilters): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(`${this.apiUrl}/sto-queue`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 3000,
    });

    // Fallback to mock mode if connection fails
    const connectionTimeout = setTimeout(() => {
      if (!this.connected()) {
        console.warn('WebSocket connection failed, using mock mode');
        this.startMockMode(displayId, filters);
      }
    }, 5000);

    this.socket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket connected');
      this.connected.set(true);
      this.displayId.set(displayId);

      // Register display with filters
      this.socket?.emit('register_display', {
        displayId,
        filters: filters || {},
      });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connected.set(false);
    });

    this.socket.on('queue_update', (data: { orders: StoOrder[] }) => {
      console.log('Queue update received:', data.orders.length);
      this.orders.set(data.orders);
    });

    this.socket.on('order_status_change', (data: { order: StoOrder }) => {
      console.log('Order status changed:', data.order.id, data.order.status);
      this.updateOrderInList(data.order);
    });

    this.socket.on('new_order', (data: { order: StoOrder }) => {
      console.log('New order:', data.order.id);
      this.addOrderToList(data.order);
    });
  }

  disconnect(): void {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected.set(false);
      this.displayId.set(null);
      this.orders.set([]);
    }
  }

  private startMockMode(displayId: string, filters?: DisplayFilters): void {
    console.log('Starting mock mode with sample data');
    this.connected.set(true);
    this.displayId.set(displayId);
    
    // Generate initial mock data
    let mockOrders = this.generateMockOrders();
    
    // Apply filters if provided
    if (filters?.zones && filters.zones.length > 0) {
      mockOrders = mockOrders.filter(o => filters.zones!.includes(o.zone));
    }
    if (filters?.workTypes && filters.workTypes.length > 0) {
      mockOrders = mockOrders.filter(o => filters.workTypes!.includes(o.workType));
    }
    if (!filters?.showBlocked) {
      mockOrders = mockOrders.filter(o => o.status !== 'blocked');
    }
    
    this.orders.set(mockOrders);

    // Simulate real-time updates every 5 seconds
    this.mockDataInterval = setInterval(() => {
      const currentOrders = this.orders();
      if (currentOrders.length > 0) {
        // Randomly update one order status
        const randomIndex = Math.floor(Math.random() * currentOrders.length);
        const updatedOrders = [...currentOrders];
        const order = { ...updatedOrders[randomIndex] } as StoOrder;
        
        // Cycle through statuses
        if (order.status === 'waiting') {
          order.status = 'in_progress';
          order.startedAt = new Date().toISOString();
          order.mechanicId = `mech-00${Math.floor(Math.random() * 3) + 1}`;
        } else if (order.status === 'in_progress') {
          order.status = 'completed';
          order.completedAt = new Date().toISOString();
        }
        
        updatedOrders[randomIndex] = order;
        this.orders.set(updatedOrders);
      }
    }, 5000);
  }

  private updateOrderInList(updatedOrder: StoOrder): void {
    const currentOrders = this.orders();
    const index = currentOrders.findIndex(o => o.id === updatedOrder.id);
    
    if (index !== -1) {
      const newOrders = [...currentOrders];
      newOrders[index] = updatedOrder;
      this.orders.set(newOrders);
    }
  }

  private addOrderToList(newOrder: StoOrder): void {
    const currentOrders = this.orders();
    this.orders.set([newOrder, ...currentOrders]);
  }

  // Request manual refresh
  requestQueueUpdate(): void {
    if (this.socket?.connected && this.displayId()) {
      this.socket.emit('request_queue_update', {
        displayId: this.displayId(),
      });
    }
  }

  // Update display filters
  updateFilters(filters: DisplayFilters): void {
    if (this.socket?.connected && this.displayId()) {
      this.socket.emit('update_filters', {
        displayId: this.displayId(),
        filters,
      });
    }
  }
}
