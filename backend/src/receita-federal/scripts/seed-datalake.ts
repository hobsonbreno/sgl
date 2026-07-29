import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ReceitaFederalService } from '../receita-federal.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedDataLake');
  logger.log(
    'Iniciando script de Sincronização do Data Lake da Receita Federal (ETL Standalone)...',
  );

  // Inicializa o contexto do NestJS apenas para injetar os serviços (Não abre servidor HTTP)
  const app = await NestFactory.createApplicationContext(AppModule);

  const receitaFederalService = app.get(ReceitaFederalService);

  try {
    logger.log('Iniciando o pipeline ETL...');
    // Executando o Pipeline Completo da Receita Federal
    await receitaFederalService.runETLPipeline();

    logger.log('[SeedDataLake] Pipeline concluído com sucesso.');
  } catch (err) {
    logger.error(`[SeedDataLake] Pipeline falhou após retries: ${(err as any).message}`);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
