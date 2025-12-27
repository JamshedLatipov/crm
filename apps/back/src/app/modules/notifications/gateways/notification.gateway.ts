import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '../../shared/entities/notification.entity';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this for production security
  },
  namespace: 'notifications',
})
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Mapping from userId to Set of socketIds (user might have multiple tabs open)
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake query or headers
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token as string ||
        (client.handshake.headers.authorization ? client.handshake.headers.authorization.split(' ')[1] : null);

      if (!token) {
        console.log('No token provided for notification socket connection');
        client.disconnect();
        return;
      }

      // Verify token
      try {
        const decoded = await this.jwtService.verifyAsync(token);
        if (!decoded || !decoded.sub) {
          throw new Error('Invalid token structure');
        }

        const userId = String(decoded.sub);

        // Register socket
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(client.id);

        // Store userId in socket data for easy access on disconnect
        client.data.userId = userId;

        console.log(`Client connected: ${client.id} (User: ${userId})`);
      } catch (err) {
        console.log('Invalid token for notification socket connection:', err.message);
        client.disconnect();
        return;
      }

    } catch (e) {
      console.error('Socket connection error', e);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('notification.created')
  handleNotificationCreatedEvent(payload: any) {
    if (payload.channel === NotificationChannel.IN_APP) {
      this.sendToUser(payload.recipientId, payload);
    }
  }

  sendToUser(userId: string, payload: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification', payload);
      });
      return true;
    }
    return false;
  }
}
