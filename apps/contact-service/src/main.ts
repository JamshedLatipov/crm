import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';

async function bootstrap() {
  const logger = new Logger('ContactService');

  // Create hybrid application (HTTP + Microservice)
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Connect RabbitMQ microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_CONFIG.url],
      queue: QUEUES.CONTACT_QUEUE,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
    },
  });

  // Enable CORS for HTTP endpoints
  app.enableCors();

  // Start all microservices
  await app.startAllMicroservices();

  // Start HTTP server for health checks and direct API access
  const httpPort = process.env['CONTACT_HTTP_PORT'] || 3011;
  await app.listen(httpPort);

  logger.log(`🚀 Contact Service is running`);
  logger.log(`   HTTP: http://localhost:${httpPort}`);
  logger.log(`   RabbitMQ Queue: ${QUEUES.CONTACT_QUEUE}`);
}

bootstrap();
