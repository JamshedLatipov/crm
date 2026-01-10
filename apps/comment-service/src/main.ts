import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'comment_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  
  const port = process.env.PORT || 3014;
  await app.listen(port);
  
  Logger.log(`🚀 Comment Service running on port ${port}`, 'Bootstrap');
}

bootstrap();
