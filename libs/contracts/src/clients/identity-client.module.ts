import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES, RABBITMQ_CONFIG } from '../constants';
import { IdentityClientService } from './identity-client.service';

export interface IdentityClientModuleOptions {
  rabbitMqUrl?: string;
}

@Global()
@Module({})
export class IdentityClientModule {
  static register(options?: IdentityClientModuleOptions): DynamicModule {
    return {
      module: IdentityClientModule,
      imports: [
        ClientsModule.register([
          {
            name: SERVICES.IDENTITY,
            transport: Transport.RMQ,
            options: {
              urls: [options?.rabbitMqUrl || RABBITMQ_CONFIG.url],
              queue: QUEUES.IDENTITY_QUEUE,
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      providers: [IdentityClientService],
      exports: [IdentityClientService, ClientsModule],
    };
  }
}
