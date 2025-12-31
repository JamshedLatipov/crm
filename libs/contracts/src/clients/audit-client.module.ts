import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUDIT_SERVICE } from '../constants';

@Global()
@Module({})
export class AuditClientModule {
  static register(rabbitmqUrl?: string): DynamicModule {
    return {
      module: AuditClientModule,
      imports: [
        ClientsModule.register([
          {
            name: AUDIT_SERVICE,
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl || process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
              queue: 'crm_audit_queue',
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
