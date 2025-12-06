/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false});
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS disabled
  app.enableCors(
    {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    }
  );

  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('CRM backend API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT || 3000;
  // Enable ClassSerializerInterceptor globally to respect class-transformer decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 Swagger docs available at: http://localhost:${port}/swagger`
  );
}

bootstrap();
