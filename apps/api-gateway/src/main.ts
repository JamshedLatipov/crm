import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('ApiGateway');

  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('CRM Microservices API Gateway Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('contacts', 'Contact management')
    .addTag('leads', 'Lead management')
    .addTag('deals', 'Deal management')
    .addTag('tasks', 'Task management')
    .addTag('telephony', 'Telephony & Calls')
    .addTag('notifications', 'Notification management')
    .addTag('analytics', 'Analytics & Reports')
    .addTag('campaigns', 'Campaign management')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // CORS for frontend
  app.enableCors({
    origin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:4200'],
    credentials: true,
  });

  const port = process.env['GATEWAY_PORT'] || 3001;
  await app.listen(port);

  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  logger.log(`📊 Health check: http://localhost:${port}/api/health`);
}

bootstrap();
