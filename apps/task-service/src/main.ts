import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';

async function bootstrap() {
  const logger = new Logger('TaskService');

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
      queue: QUEUES.TASK_QUEUE,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
    },
  });

  app.enableCors();

  await app.startAllMicroservices();

  const httpPort = process.env['TASK_HTTP_PORT'] || 3014;
  await app.listen(httpPort);

  logger.log(`🚀 Task Service is running`);
  logger.log(`   HTTP: http://localhost:${httpPort}`);
  logger.log(`   RabbitMQ Queue: ${QUEUES.TASK_QUEUE}`);
}

bootstrap();
