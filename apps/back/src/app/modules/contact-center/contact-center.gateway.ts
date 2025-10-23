import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { ContactCenterService } from './contact-center.service';

@WebSocketGateway({ path: '/api/contact-center/ws', cors: true })
export class ContactCenterGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly svc: ContactCenterService) {}

  onModuleInit() {
    // Broadcast demo data every 3 seconds
    setInterval(() => {
      const data = this.svc.tick();
      // broadcast operators
      const opMsg = JSON.stringify({ type: 'operators', payload: data.operators });
      const qMsg = JSON.stringify({ type: 'queues', payload: data.queues });
      this.server.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(opMsg);
          client.send(qMsg);
        }
      });
    }, 3000);
  }
}
