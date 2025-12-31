import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('CampaignService');
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'crm_campaign_queue',
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();

  await app.startAllMicroservices();
  
  const port = process.env.CAMPAIGN_HTTP_PORT || 3018;
  await app.listen(port);
  
  logger.log(`Campaign Service HTTP on port ${port}`);
  logger.log('Campaign Service RabbitMQ microservice started');
}

bootstrap();
