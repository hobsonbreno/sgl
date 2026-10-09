import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { json, urlencoded } from 'express';

import { DatabaseLoggerService } from './observability/database-logger.service';
import compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(
    compression({
      level: 4,
      threshold: 1024,
    }),
  );
  app.useLogger(app.get(DatabaseLoggerService));
  app.enableCors();

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const config = new DocumentBuilder()
    .setTitle('PNCP Licitações API')
    .setDescription('API para gestão de licitações e dispensas do PNCP')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap().catch(console.error);
