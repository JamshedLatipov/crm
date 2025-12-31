import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';

const TELEPHONY_QUEUE = 'crm_telephony_queue';

async function bootstrap() {
  const logger = new Logger('TelephonyService');

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_CONFIG.url],
      queue: TELEPHONY_QUEUE,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
    },
  });

  app.enableCors();

  await app.startAllMicroservices();

  const httpPort = process.env['TELEPHONY_HTTP_PORT'] || 3016;
  await app.listen(httpPort);

  logger.log(`🚀 Telephony Service is running`);
  logger.log(`   HTTP: http://localhost:${httpPort}`);
  logger.log(`   RabbitMQ Queue: ${TELEPHONY_QUEUE}`);
}

bootstrap();
