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
    this.logger.log(
      '✅ ContactCenter WebSocket Gateway initialized on path: /api/contact-center/ws'
    );

    // Broadcast demo data every 3 seconds
    setInterval(async () => {
      try {
        const startTime = Date.now();
        const data = await this.svc.tick();
        const fetchTime = Date.now() - startTime;

        if (fetchTime > 2000) {
          this.logger.warn(
            `⚠️ tick() took ${fetchTime}ms (should be < 2000ms)`
          );
        }

        // Validate data before broadcasting
        const validation = this.validateData(data);
        if (!validation.valid) {
          this.logger.error(
            `❌ Invalid data from tick(): ${validation.errors.join(', ')}`
          );
          return;
        }

        // Log what we're about to send (summary)
        const operatorsOnCall = data.operators.filter(
          (op) => op.status === 'on_call'
        ).length;
        const totalCallsInService = data.queues.reduce(
          (sum, q) => sum + q.callsInService,
          0
        );
        const totalWaitingSum = data.queues.reduce(
          (sum, q) => sum + q.waiting,
          0
        );

        this.logger.debug(
          `Broadcasting: ${data.operators.length} operators (${operatorsOnCall} on call), ${totalWaitingSum} waiting (${data.totalUniqueWaiting} unique), ${totalCallsInService} in service, ${data.activeCalls.length} active calls`
        );

        // Prepare messages
        const opMsg = JSON.stringify({
          type: 'operators',
          payload: data.operators,
        });
        const qMsg = JSON.stringify({ type: 'queues', payload: data.queues });
        const callsMsg = JSON.stringify({
          type: 'activeCalls',
          payload: data.activeCalls,
        });
        const statsMsg = JSON.stringify({
          type: 'stats',
          payload: { totalUniqueWaiting: data.totalUniqueWaiting },
        });

        if (!this.server) {
          this.logger.warn(
            'WebSocket server not initialized yet; skipping broadcast'
          );
          return;
        }

        // Broadcast to all connected WebSocket clients
        let clientCount = 0;
        let bytesSent = 0;

        this.server.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            // WebSocket.OPEN = 1
            try {
              client.send(opMsg);
              client.send(qMsg);
              client.send(callsMsg);
              client.send(statsMsg);
              clientCount++;
              bytesSent +=
                opMsg.length + qMsg.length + callsMsg.length + statsMsg.length;
            } catch (err) {
              this.logger.error(`Failed to send to client:`, err);
            }
          }
        });

        if (clientCount > 0) {
          this.logger.debug(
            `📡 Broadcasted to ${clientCount} clients (${Math.round(
              bytesSent / 1024
            )}KB total)`
          );
        }
      } catch (err) {
        this.logger.error('ContactCenter broadcast error', err as Error);
      }
    }, 3000);
  }

  // Validate data before broadcasting
  private validateData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate operators
    if (!Array.isArray(data.operators)) {
      errors.push('operators is not an array');
    } else {
      data.operators.forEach((op: any, idx: number) => {
        if (!op.id || !op.name) {
          errors.push(`Operator ${idx} missing id or name`);
        }
        if (!['idle', 'on_call', 'wrap_up', 'offline'].includes(op.status)) {
          errors.push(`Operator ${op.name} has invalid status: ${op.status}`);
        }
        if (op.status === 'on_call' && !op.currentCall) {
          this.logger.warn(
            `⚠️ Operator ${op.name} is on_call but has no currentCall`
          );
        }
      });
    }

    // Validate queues
    if (!Array.isArray(data.queues)) {
      errors.push('queues is not an array');
    } else {
      data.queues.forEach((q: any, idx: number) => {
        if (!q.id || !q.name) {
          errors.push(`Queue ${idx} missing id or name`);
        }
        if (q.waiting < 0) {
          errors.push(`Queue ${q.name} has negative waiting: ${q.waiting}`);
        }
        if (q.callsInService < 0) {
          errors.push(
            `Queue ${q.name} has negative callsInService: ${q.callsInService}`
          );
        }
      });
    }

    // Validate activeCalls
    if (!Array.isArray(data.activeCalls)) {
      errors.push('activeCalls is not an array');
    }

    // Validate totalUniqueWaiting
    if (
      typeof data.totalUniqueWaiting !== 'number' ||
      data.totalUniqueWaiting < 0
    ) {
      errors.push(`Invalid totalUniqueWaiting: ${data.totalUniqueWaiting}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
