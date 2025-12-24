import { OnModuleInit, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server as WsServer, WebSocket } from 'ws';
import { ContactCenterService } from './contact-center.service';

@WebSocketGateway({ path: '/api/contact-center/ws', cors: true })
export class ContactCenterGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ContactCenterGateway.name);

  @WebSocketServer()
  server: WsServer;

  constructor(private readonly svc: ContactCenterService) {}

  handleConnection(client: any) {
    this.logger.log(`✅ Client connected to WebSocket`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`❌ Client disconnected from WebSocket`);
  }

  onModuleInit() {
    this.logger.log('✅ ContactCenter WebSocket Gateway initialized on path: /api/contact-center/ws');
    
    // Broadcast demo data every 3 seconds
    setInterval(async () => {
      try {
        const data = await this.svc.tick();
        
        // Log queue details
        data.queues.forEach(q => {
          this.logger.debug(`Queue ${q.name}: waiting=${q.waiting}, callsInService=${q.callsInService}, serviceLevel=${q.serviceLevel}`);
        });
        
        this.logger.debug(`Broadcasting: ${data.operators.length} operators, ${data.queues.length} queues, ${data.activeCalls.length} calls`);
        
        const opMsg = JSON.stringify({ type: 'operators', payload: data.operators });
        const qMsg = JSON.stringify({ type: 'queues', payload: data.queues });
        const callsMsg = JSON.stringify({ type: 'activeCalls', payload: data.activeCalls });

        if (!this.server) {
          this.logger.warn('WebSocket server not initialized yet; skipping broadcast');
          return;
        }

        // Broadcast to all connected WebSocket clients
        let clientCount = 0;
        this.server.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) { // WebSocket.OPEN = 1
            client.send(opMsg);
            client.send(qMsg);
            client.send(callsMsg);
            clientCount++;
          }
        });
        
        if (clientCount > 0) {
          this.logger.log(`📤 Sent data to ${clientCount} client(s): ${data.operators.length} ops, ${data.queues.length} queues, ${data.activeCalls.length} calls`);
        } else {
          this.logger.debug('No clients connected');
        }
      } catch (err) {
        this.logger.error('ContactCenter broadcast error', err as Error);
      }
    }, 3000);
  }
}
