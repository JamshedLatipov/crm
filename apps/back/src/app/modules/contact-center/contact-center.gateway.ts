import { OnModuleInit, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server as WsServer } from 'ws';
import type { Server as SocketIOServer } from 'socket.io';
import { ContactCenterService } from './contact-center.service';

@WebSocketGateway({ path: '/api/contact-center/ws', cors: true })
export class ContactCenterGateway implements OnModuleInit {
  private readonly logger = new Logger(ContactCenterGateway.name);

  @WebSocketServer()
  server: unknown; // can be ws.Server or socket.io Server depending on installed platform

  constructor(private readonly svc: ContactCenterService) {}

  onModuleInit() {
    // Broadcast demo data every 3 seconds
    setInterval(async () => {
      try {
        const data = await this.svc.tick();
        const opMsg = JSON.stringify({ type: 'operators', payload: data.operators });
        const qMsg = JSON.stringify({ type: 'queues', payload: data.queues });

        if (!this.server) {
          this.logger.warn('WebSocket server not initialized yet; skipping broadcast');
          return;
        }

        // ws (ws.Server) shape: has `.clients` Set of WebSocket instances
        const wsServer = this.server as WsServer | undefined;
        if (wsServer && (wsServer as any).clients && typeof (wsServer as any).clients.forEach === 'function') {
          // Safe-guard client iteration
          try {
            (wsServer as any).clients.forEach((client: any) => {
              if (client && client.readyState === client.OPEN) {
                client.send(opMsg);
                client.send(qMsg);
              }
            });
            return;
          } catch (err) {
            this.logger.warn('Error broadcasting to ws clients', err as Error);
          }
        }

        // socket.io shape: Server has `emit` or `sockets` namespace
        const io = this.server as unknown as SocketIOServer | undefined;
        if (io && typeof (io as any).emit === 'function') {
          // emit structured messages to all connected sockets
          try {
            (io as any).emit('message', { type: 'operators', payload: data.operators });
            (io as any).emit('message', { type: 'queues', payload: data.queues });
            return;
          } catch (err) {
            this.logger.warn('Error broadcasting to socket.io clients', err as Error);
          }
        }

        this.logger.warn('Unknown WebSocket server shape; cannot broadcast');
      } catch (err) {
        this.logger.error('ContactCenter broadcast error', err as Error);
      }
    }, 3000);
  }
}
