import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('AuditService');

  const app = await NestFactory.create(AppModule);

  // RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'crm_audit_queue',
      queueOptions: { durable: true },
    },
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  await app.startAllMicroservices();

  const port = process.env.PORT || 3019;
  await app.listen(port);

  logger.log(`🔍 Audit Service is running on port ${port}`);
  logger.log(`📨 RabbitMQ queue: crm_audit_queue`);
}

bootstrap();

