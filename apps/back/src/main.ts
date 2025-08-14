/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS configuration
  const defaultOrigins = [
    'http://localhost:4200', // Angular/Vite (Nx) default
    'http://127.0.0.1:4200',
    'http://localhost:5173', // Vite fallback
    'http://127.0.0.1:5173'
  ];
  const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...extraOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
  // Optionally log blocked origins
  console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Authorization,Content-Type,Accept,Origin,X-Requested-With',
    exposedHeaders: 'Authorization'
  });

  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('CRM backend API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 Swagger docs available at: http://localhost:${port}/swagger`
  );
}

bootstrap();
