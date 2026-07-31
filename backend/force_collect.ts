import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ResultadoItemCollectorService } from './src/pncp/services/resultado-item-collector/resultado-item-collector.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const collector = app.get(ResultadoItemCollectorService);
  
  console.log('--- RUNNING JOB ---');
  await collector.collectResultadosHomologados();
  console.log('--- JOB FINISHED ---');
  
  await app.close();
}
bootstrap();
