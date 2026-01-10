import { OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ContactCenterService } from './contact-center.service';

@WebSocketGateway({ 
  path: '/api/contact-center/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ContactCenterGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ContactCenterGateway.name);
  private broadcastInterval: NodeJS.Timeout | null = null;

  @WebSocketServer()
  server: Server;

  constructor(private readonly svc: ContactCenterService) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected from WebSocket: ${client.id}`);
  }

  onModuleInit() {
    this.logger.log(
      '✅ ContactCenter WebSocket Gateway initialized on path: /api/contact-center/ws'
    );

    // Broadcast demo data every 3 seconds
    this.broadcastInterval = setInterval(async () => {
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
        
        // Prepare messages
        const messages = {
          operators: { type: 'operators', payload: data.operators },
          queues: { type: 'queues', payload: data.queues },
          activeCalls: { type: 'activeCalls', payload: data.activeCalls },
          stats: { type: 'stats', payload: { totalUniqueWaiting: data.totalUniqueWaiting } },
        };

        if (!this.server) {
          this.logger.warn(
            'WebSocket server not initialized yet; skipping broadcast'
          );
          return;
        }

        // Broadcast to all connected Socket.IO clients
        const clientCount = this.server.sockets.sockets.size;
        
        if (clientCount > 0) {
          this.server.emit('operators', messages.operators);
          this.server.emit('queues', messages.queues);
          this.server.emit('activeCalls', messages.activeCalls);
          this.server.emit('stats', messages.stats);
        }
      } catch (err) {
        this.logger.error('ContactCenter broadcast error', err as Error);
      }
    }, 3000);
  }

  onModuleDestroy() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      this.logger.log('ContactCenter broadcast interval cleared');
    }
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

  /**
   * Broadcast agent status change to all connected clients
   * Called when an agent's status changes
   */
  broadcastAgentStatusChange(data: {
    extension: string;
    status: string;
    previousStatus?: string;
    reason?: string;
    fullName?: string;
    userId?: number;
  }) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized yet; cannot broadcast agent status');
      return;
    }

    const message = {
      type: 'agent:status_changed',
      payload: data,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('agent:status_changed', message);
    this.logger.log(
      `Broadcasted agent status change: ${data.extension} -> ${data.status}`
    );
  }

  /**
   * Broadcast queue event (call entered, answered, abandoned, etc.)
   */
  broadcastQueueEvent(event: {
    type: 'queue:call_entered' | 'queue:call_answered' | 'queue:call_abandoned' | 'queue:member_added' | 'queue:member_removed';
    queueName: string;
    data: any;
  }) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized yet; cannot broadcast queue event');
      return;
    }

    const message = {
      type: event.type,
      payload: {
        queueName: event.queueName,
        ...event.data,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.emit(event.type, message);
    this.logger.debug(`Broadcasted queue event: ${event.type} for ${event.queueName}`);
  }
}
