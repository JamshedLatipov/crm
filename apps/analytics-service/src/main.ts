import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');
  const app = await NestFactory.create(AppModule);

  // RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'crm_analytics_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();

  await app.startAllMicroservices();
  
  const port = process.env.ANALYTICS_HTTP_PORT || 3017;
  await app.listen(port);
  
  logger.log(`Analytics Service HTTP on port ${port}`);
  logger.log('Analytics Service RabbitMQ microservice started');
}

bootstrap();
