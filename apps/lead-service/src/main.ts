import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';

async function bootstrap() {
  const logger = new Logger('LeadService');

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
      queue: QUEUES.LEAD_QUEUE,
      queueOptions: { durable: true },
      prefetchCount: 10,
    },
  });

  app.enableCors();
  await app.startAllMicroservices();

  const httpPort = process.env['LEAD_HTTP_PORT'] || 3012;
  await app.listen(httpPort);

  logger.log(`🚀 Lead Service is running`);
  logger.log(`   HTTP: http://localhost:${httpPort}`);
  logger.log(`   RabbitMQ Queue: ${QUEUES.LEAD_QUEUE}`);
}

bootstrap();
