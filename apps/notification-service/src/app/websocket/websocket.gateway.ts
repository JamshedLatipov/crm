import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from all user mappings
    for (const [userId, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { userId: string }) {
    const { userId } = payload;
    if (!userId) return;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.add(client.id);
    }
    
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} subscribed with socket ${client.id}`);
    
    return { status: 'subscribed', userId };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { userId: string }) {
    const { userId } = payload;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    client.leave(`user:${userId}`);
    this.logger.log(`User ${userId} unsubscribed socket ${client.id}`);
    
    return { status: 'unsubscribed', userId };
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast ${event} to all users`);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }
}
