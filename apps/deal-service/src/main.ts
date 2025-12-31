import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { RABBITMQ_CONFIG, DEAL_QUEUE } from '@crm/contracts';

async function bootstrap() {
  const logger = new Logger('DealService');

  const app = await NestFactory.create(AppModule);

  // Подключение к RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || RABBITMQ_CONFIG.url],
      queue: DEAL_QUEUE,
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3013);

  logger.log(`Deal Service is running on port ${process.env.PORT || 3013}`);
  logger.log(`RabbitMQ connected to queue: ${DEAL_QUEUE}`);
}

bootstrap();
