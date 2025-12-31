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
import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificationService } from '../../shared/services/notification.service';
import { Notification } from '../../shared/entities/notification.entity';
import { RedisClientType } from 'redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

interface PubSubMessage {
  type: 'notification' | 'unread_count' | 'broadcast';
  userId?: string;
  userIds?: string[];
  payload: unknown;
}

const REDIS_PREFIX = 'ws:notifications:';
const PUBSUB_CHANNEL = 'notifications:events';
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour (auto-cleanup for stale sessions)

@Injectable()
@WebSocketGateway({
  path: '/notifications/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  
  // Local cache for this instance's sockets only (for fast local delivery)
  private readonly localSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs
  
  // Instance ID for identifying this server instance
  private readonly instanceId = `instance:${process.pid}:${Date.now()}`;
  
  // Subscriber client (separate connection for pub/sub)
  private subscriber: RedisClientType | null = null;

  constructor(
    private readonly notificationService: NotificationService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async onModuleInit() {
    await this.setupPubSub();
  }

  async onModuleDestroy() {
    // Cleanup all sessions for this instance
    await this.cleanupInstanceSessions();
    
    // Unsubscribe from pub/sub
    if (this.subscriber) {
      try {
        await this.subscriber.unsubscribe(PUBSUB_CHANNEL);
        await this.subscriber.quit();
      } catch (err) {
        this.logger.warn('Error cleaning up Redis subscriber:', err);
      }
    }
  }

  private async setupPubSub() {
    try {
      // Create a duplicate client for subscribing (Redis requires separate connection for pub/sub)
      this.subscriber = this.redis.duplicate() as RedisClientType;
      await this.subscriber.connect();
      
      await this.subscriber.subscribe(PUBSUB_CHANNEL, (message: string) => {
        this.handlePubSubMessage(message);
      });
      
      this.logger.log(`✅ Redis Pub/Sub initialized for instance ${this.instanceId}`);
    } catch (err) {
      this.logger.error('Failed to setup Redis Pub/Sub:', err);
    }
  }

  private handlePubSubMessage(message: string) {
    try {
      const data: PubSubMessage = JSON.parse(message);
      
      switch (data.type) {
        case 'notification':
          if (data.userId) {
            this.deliverToLocalSockets(data.userId, 'new_notification', data.payload);
          }
          break;
        case 'unread_count':
          if (data.userId) {
            this.deliverToLocalSockets(data.userId, 'unread_count', data.payload);
          }
          break;
        case 'broadcast':
          if (data.userIds) {
            for (const userId of data.userIds) {
              this.deliverToLocalSockets(userId, 'new_notification', data.payload);
            }
          }
          break;
      }
    } catch (err) {
      this.logger.warn('Failed to parse pub/sub message:', err);
    }
  }

  private deliverToLocalSockets(userId: string, event: string, payload: unknown) {
    const sockets = this.localSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit(event, payload);
      });
    }
  }

  afterInit(server: Server) {
    this.logger.log('✅ Notifications WebSocket Gateway initialized on path: /notifications/ws');
    this.logger.log(`Instance ID: ${this.instanceId}`);
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Extract userId from handshake query or auth token
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      client.userId = userId;
      
      // Store socket in local cache
      if (!this.localSockets.has(userId)) {
        this.localSockets.set(userId, new Set());
      }
      this.localSockets.get(userId)?.add(client.id);
      
      // Register in Redis for cross-instance discovery
      await this.registerSession(userId, client.id);
      
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
      
      // Send initial unread count
      this.sendUnreadCount(client, userId);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.userId) {
      // Remove from local cache
      const sockets = this.localSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.localSockets.delete(client.userId);
        }
      }
      
      // Remove from Redis
      await this.unregisterSession(client.userId, client.id);
      
      this.logger.log(`User ${client.userId} disconnected socket ${client.id}`);
    }
  }

  // Redis session management
  private async registerSession(userId: string, socketId: string): Promise<void> {
    try {
      const key = `${REDIS_PREFIX}user:${userId}`;
      const sessionData = JSON.stringify({ socketId, instanceId: this.instanceId, ts: Date.now() });
      
      // Use Redis Hash to store multiple sessions per user
      await this.redis.hSet(key, socketId, sessionData);
      await this.redis.expire(key, SESSION_TTL_SECONDS);
      
      // Also track by instance for cleanup
      const instanceKey = `${REDIS_PREFIX}instance:${this.instanceId}`;
      await this.redis.sAdd(instanceKey, `${userId}:${socketId}`);
      await this.redis.expire(instanceKey, SESSION_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Failed to register session in Redis:`, err);
    }
  }

  private async unregisterSession(userId: string, socketId: string): Promise<void> {
    try {
      const key = `${REDIS_PREFIX}user:${userId}`;
      await this.redis.hDel(key, socketId);
      
      const instanceKey = `${REDIS_PREFIX}instance:${this.instanceId}`;
      await this.redis.sRem(instanceKey, `${userId}:${socketId}`);
    } catch (err) {
      this.logger.warn(`Failed to unregister session from Redis:`, err);
    }
  }

  private async cleanupInstanceSessions(): Promise<void> {
    try {
      const instanceKey = `${REDIS_PREFIX}instance:${this.instanceId}`;
      const sessions = await this.redis.sMembers(instanceKey);
      
      for (const session of sessions) {
        const [userId, socketId] = session.split(':');
        if (userId && socketId) {
          const key = `${REDIS_PREFIX}user:${userId}`;
          await this.redis.hDel(key, socketId);
        }
      }
      
      await this.redis.del(instanceKey);
      this.logger.log(`Cleaned up ${sessions.length} sessions for instance ${this.instanceId}`);
    } catch (err) {
      this.logger.warn('Failed to cleanup instance sessions:', err);
    }
  }

  @SubscribeMessage('subscribe_notifications')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string }
  ) {
    const userId = data.userId || client.userId;
    
    if (userId) {
      client.userId = userId;
      client.join(`user:${userId}`);
      
      if (!this.localSockets.has(userId)) {
        this.localSockets.set(userId, new Set());
      }
      this.localSockets.get(userId)?.add(client.id);
      
      // Register in Redis
      await this.registerSession(userId, client.id);
      
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
   * Uses Redis Pub/Sub for cross-instance delivery
   */
  async sendNotificationToUser(userId: string, notification: Notification) {
    const localSockets = this.localSockets.get(userId);
    const hasLocalConnections = localSockets && localSockets.size > 0;
    
    // Check if user has sessions on ANY instance
    const hasAnyConnections = await this.isUserOnline(userId);
    
    if (hasAnyConnections) {
      this.logger.log(`Sending notification to user ${userId} (local: ${localSockets?.size ?? 0}, distributed: true)`);
      
      // Publish to Redis for all instances to receive
      await this.publishMessage({
        type: 'notification',
        userId,
        payload: notification,
      });
      
      // Update unread count via pub/sub
      const count = await this.notificationService.getUnreadCount(userId);
      await this.publishMessage({
        type: 'unread_count',
        userId,
        payload: { count },
      });
    } else {
      this.logger.debug(`User ${userId} has no active connections`);
    }
  }

  /**
   * Broadcast notification to multiple users
   * Uses Redis Pub/Sub for cross-instance delivery
   */
  async broadcastNotification(userIds: string[], notification: Notification) {
    // Filter to only online users
    const onlineUsers: string[] = [];
    for (const userId of userIds) {
      if (await this.isUserOnline(userId)) {
        onlineUsers.push(userId);
      }
    }
    
    if (onlineUsers.length > 0) {
      await this.publishMessage({
        type: 'broadcast',
        userIds: onlineUsers,
        payload: notification,
      });
      
      this.logger.log(`Broadcast notification to ${onlineUsers.length} online users`);
    }
  }

  private async publishMessage(message: PubSubMessage): Promise<void> {
    try {
      await this.redis.publish(PUBSUB_CHANNEL, JSON.stringify(message));
    } catch (err) {
      this.logger.warn('Failed to publish message to Redis:', err);
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
   * Get list of online users (from Redis - across all instances)
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      const keys = await this.redis.keys(`${REDIS_PREFIX}user:*`);
      return keys.map(key => key.replace(`${REDIS_PREFIX}user:`, ''));
    } catch (err) {
      this.logger.warn('Failed to get online users from Redis:', err);
      // Fallback to local cache
      return Array.from(this.localSockets.keys());
    }
  }

  /**
   * Check if user is online (from Redis - across all instances)
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const key = `${REDIS_PREFIX}user:${userId}`;
      const sessions = await this.redis.hLen(key);
      return sessions > 0;
    } catch (err) {
      this.logger.warn('Failed to check user online status from Redis:', err);
      // Fallback to local cache
      return this.localSockets.has(userId) && (this.localSockets.get(userId)?.size ?? 0) > 0;
    }
  }

  /**
   * Get count of user's active sessions (across all instances)
   */
  async getUserSessionCount(userId: string): Promise<number> {
    try {
      const key = `${REDIS_PREFIX}user:${userId}`;
      return await this.redis.hLen(key);
    } catch (err) {
      this.logger.warn('Failed to get user session count from Redis:', err);
      return this.localSockets.get(userId)?.size ?? 0;
    }
  }
}
