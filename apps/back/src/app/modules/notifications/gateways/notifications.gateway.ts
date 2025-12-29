import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../shared/services/notification.service';
import { Notification } from '../../shared/entities/notification.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@Injectable()
@WebSocketGateway({
  path: '/notifications/ws',
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs

  constructor(private readonly notificationService: NotificationService) {}

  afterInit(server: Server) {
    this.logger.log('✅ Notifications WebSocket Gateway initialized on path: /notifications/ws');
    this.logger.log(`CORS origins: ${JSON.stringify(['http://localhost:4200', 'http://localhost:3000'])}`);
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Extract userId from handshake query or auth token
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      client.userId = userId;
      
      // Store socket connection for user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);
      
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
      
      // Send initial unread count
      this.sendUnreadCount(client, userId);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userId} disconnected socket ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe_notifications')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string }
  ) {
    const userId = data.userId || client.userId;
    
    if (userId) {
      client.userId = userId;
      client.join(`user:${userId}`);
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);
      
      this.logger.log(`Client ${client.id} subscribed to notifications for user ${userId}`);
      
      // Send current unread count
      this.sendUnreadCount(client, userId);
      
      return { success: true, message: 'Subscribed to notifications' };
    }
    
    return { success: false, message: 'User ID required' };
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { limit?: number; offset?: number; unreadOnly?: boolean }
  ) {
    const userId = client.userId;
    
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    try {
      const result = await this.notificationService.findByFilter({
        recipientId: userId,
        unreadOnly: data.unreadOnly,
        limit: data.limit || 20,
        offset: data.offset || 0,
      });
      
      return { success: true, data: result.data, total: result.total };
    } catch (error) {
      this.logger.error(`Error fetching notifications for user ${userId}:`, error);
      return { success: false, message: 'Failed to fetch notifications' };
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: number }
  ) {
    const userId = client.userId;
    
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    try {
      const success = await this.notificationService.markAsRead(data.notificationId, userId);
      
      if (success) {
        // Send updated unread count
        await this.sendUnreadCount(client, userId);
      }
      
      return { success, message: success ? 'Marked as read' : 'Notification not found' };
    } catch (error) {
      this.logger.error(`Error marking notification as read:`, error);
      return { success: false, message: 'Failed to mark as read' };
    }
  }

  @SubscribeMessage('mark_all_as_read')
  async handleMarkAllAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.userId;
    
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    try {
      const count = await this.notificationService.markAllAsRead(userId);
      
      // Send updated unread count
      await this.sendUnreadCount(client, userId);
      
      return { success: true, markedCount: count };
    } catch (error) {
      this.logger.error(`Error marking all notifications as read:`, error);
      return { success: false, message: 'Failed to mark all as read' };
    }
  }

  /**
   * Send a new notification to a specific user
   * Called from other services when a new notification is created
   */
  async sendNotificationToUser(userId: string, notification: Notification) {
    const sockets = this.userSockets.get(userId);
    
    if (sockets && sockets.size > 0) {
      this.logger.log(`Sending notification to user ${userId} (${sockets.size} connections)`);
      
      // Send to all user's connected sockets
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('new_notification', notification);
      });
      
      // Also send to room (for backup)
      this.server.to(`user:${userId}`).emit('new_notification', notification);
      
      // Update unread count
      const count = await this.notificationService.getUnreadCount(userId);
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('unread_count', { count });
      });
    } else {
      this.logger.debug(`User ${userId} has no active connections`);
    }
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcastNotification(userIds: string[], notification: Notification) {
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, notification);
    }
  }

  /**
   * Send current unread count to a socket
   */
  private async sendUnreadCount(socket: AuthenticatedSocket, userId: string) {
    try {
      const count = await this.notificationService.getUnreadCount(userId);
      socket.emit('unread_count', { count });
    } catch (error) {
      this.logger.error(`Error fetching unread count for user ${userId}:`, error);
    }
  }

  /**
   * Get list of online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size ?? 0) > 0;
  }
}
