import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OrdersService } from '../orders/services/orders.service';
import { StoOrder, StoOrderStatus } from '@libs/shared/sto-types';

interface DisplayRegistration {
  socketId: string;
  displayId: string;
  filters: {
    zones?: string[];
    workTypes?: string[];
    showBlocked: boolean;
  };
}

interface MechanicConnection {
  socketId: string;
  mechanicId: string;
  zone?: string;
}

@WebSocketGateway(3002, {
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/sto-queue',
})
export class StoQueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StoQueueGateway.name);
  private displayRegistrations = new Map<string, DisplayRegistration>();
  private mechanicConnections = new Map<string, MechanicConnection>();
  private updateInterval: NodeJS.Timeout;

  constructor(private readonly ordersService: OrdersService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized on port 3002');
    this.startBroadcastLoop();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { message: 'Connected to STO Queue Gateway' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove display registration
    for (const [displayId, registration] of this.displayRegistrations.entries()) {
      if (registration.socketId === client.id) {
        this.displayRegistrations.delete(displayId);
        this.logger.log(`Display unregistered: ${displayId}`);
      }
    }

    // Remove mechanic connection
    for (const [mechanicId, connection] of this.mechanicConnections.entries()) {
      if (connection.socketId === client.id) {
        this.mechanicConnections.delete(mechanicId);
        this.logger.log(`Mechanic disconnected: ${mechanicId}`);
      }
    }
  }

  @SubscribeMessage('register_display')
  handleRegisterDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { displayId: string; filters: DisplayRegistration['filters'] },
  ) {
    this.logger.log(`Display registering: ${data.displayId}`);

    // Remove old registration if exists
    const oldRegistration = this.displayRegistrations.get(data.displayId);
    if (oldRegistration && oldRegistration.socketId !== client.id) {
      this.logger.log(`Replacing old display registration for ${data.displayId}`);
    }

    this.displayRegistrations.set(data.displayId, {
      socketId: client.id,
      displayId: data.displayId,
      filters: data.filters || { showBlocked: true },
    });

    this.logger.log(`Display registered: ${data.displayId} with filters`, data.filters);

    // Send initial queue data
    this.sendQueueUpdate(data.displayId);

    return { success: true, message: 'Display registered successfully' };
  }

  @SubscribeMessage('register_mechanic')
  handleRegisterMechanic(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mechanicId: string; zone?: string },
  ) {
    this.logger.log(`Mechanic registering: ${data.mechanicId}`);

    this.mechanicConnections.set(data.mechanicId, {
      socketId: client.id,
      mechanicId: data.mechanicId,
      zone: data.zone,
    });

    this.logger.log(`Mechanic registered: ${data.mechanicId}`);

    return { success: true, message: 'Mechanic registered successfully' };
  }

  @SubscribeMessage('unregister_display')
  handleUnregisterDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { displayId: string },
  ) {
    this.displayRegistrations.delete(data.displayId);
    this.logger.log(`Display unregistered: ${data.displayId}`);
    return { success: true };
  }

  /**
   * Start broadcasting queue updates every 3 seconds
   */
  private startBroadcastLoop() {
    this.updateInterval = setInterval(async () => {
      await this.broadcastQueueUpdates();
    }, 3000);

    this.logger.log('Broadcast loop started (every 3 seconds)');
  }

  /**
   * Broadcast queue updates to all registered displays
   */
  private async broadcastQueueUpdates() {
    if (this.displayRegistrations.size === 0) {
      return;
    }

    for (const [displayId, registration] of this.displayRegistrations.entries()) {
      await this.sendQueueUpdate(displayId);
    }
  }

  /**
   * Send queue update to specific display with filtering
   */
  private async sendQueueUpdate(displayId: string) {
    const registration = this.displayRegistrations.get(displayId);
    if (!registration) {
      return;
    }

    try {
      // Get all orders
      const allOrders = await this.ordersService.findAll({});
      
      // Apply filters
      let filteredOrders = allOrders;

      if (registration.filters.zones && registration.filters.zones.length > 0) {
        filteredOrders = filteredOrders.filter(order => 
          registration.filters.zones!.includes(order.zone)
        );
      }

      if (registration.filters.workTypes && registration.filters.workTypes.length > 0) {
        filteredOrders = filteredOrders.filter(order =>
          registration.filters.workTypes!.includes(order.workType)
        );
      }

      if (!registration.filters.showBlocked) {
        filteredOrders = filteredOrders.filter(order => order.status !== StoOrderStatus.BLOCKED);
      }

      // Only send active orders (WAITING, IN_PROGRESS, BLOCKED)
      filteredOrders = filteredOrders.filter(order =>
        ['WAITING', 'IN_PROGRESS', 'BLOCKED'].includes(order.status)
      );

      // Sort by priority and creation time
      filteredOrders.sort((a, b) => {
        const priorityOrder: Record<string, number> = { URGENT: 0, VIP: 1, WARRANTY: 2, NORMAL: 3 };
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Emit to specific socket
      this.server.to(registration.socketId).emit('queue_update', {
        displayId,
        timestamp: new Date().toISOString(),
        orders: filteredOrders,
        totalCount: filteredOrders.length,
      });
    } catch (error: any) {
      this.logger.error(`Error sending queue update to ${displayId}:`, error?.message);
    }
  }

  /**
   * Notify specific order status change (called from OrdersService)
   */
  async notifyOrderStatusChange(orderId: string, newStatus: string) {
    try {
      const order = await this.ordersService.findOne(orderId);
      
      // Notify all displays showing this order's zone
      for (const [displayId, registration] of this.displayRegistrations.entries()) {
        if (!registration.filters.zones || registration.filters.zones.includes(order.zone)) {
          this.server.to(registration.socketId).emit('order_status_changed', {
            orderId,
            newStatus,
            order,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Notify mechanics in the same zone
      for (const [mechanicId, connection] of this.mechanicConnections.entries()) {
        if (!connection.zone || connection.zone === order.zone) {
          this.server.to(connection.socketId).emit('order_status_changed', {
            orderId,
            newStatus,
            order,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(`Order status change notified: ${orderId} → ${newStatus}`);
    } catch (error: any) {
      this.logger.error(`Error notifying order status change:`, error?.message);
    }
  }

  /**
   * Notify new order created (called from OrdersService)
   */
  async notifyNewOrder(order: StoOrder) {
    // Trigger immediate queue update for all displays
    await this.broadcastQueueUpdates();

    // Notify mechanics in the same zone
    for (const [mechanicId, connection] of this.mechanicConnections.entries()) {
      if (!connection.zone || connection.zone === order.zone) {
        this.server.to(connection.socketId).emit('new_order', {
          order,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(`New order notified: ${order.id} in zone ${order.zone}`);
  }

  /**
   * Manual trigger for immediate update (admin action)
   */
  async triggerImmediateUpdate() {
    this.logger.log('Manual immediate update triggered');
    await this.broadcastQueueUpdates();
  }

  /**
   * Get connected clients stats
   */
  getStats() {
    return {
      displayCount: this.displayRegistrations.size,
      mechanicCount: this.mechanicConnections.size,
      displays: Array.from(this.displayRegistrations.keys()),
      mechanics: Array.from(this.mechanicConnections.keys()),
    };
  }

  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.logger.log('Broadcast loop stopped');
    }
  }
}
