import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { Proposta, PropostaSchema } from '../proposta/proposta.schema';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { ComprasGovMonitorController } from './compras-gov-monitor.controller';
import { RadarService } from './radar.service';
import { ComprasnetPublicService } from './comprasnet-public.service';
import { OportunidadeModule } from '../oportunidade/oportunidade.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proposta.name, schema: PropostaSchema },
    ]),
    ConfiguracaoModule,
    OportunidadeModule,
    ObservabilityModule,
  ],
  controllers: [ComprasGovMonitorController],
  providers: [ComprasGovScraperService, ComprasGovMonitorService, RadarService, ComprasnetPublicService],
})
export class ComprasGovMonitorModule {}
