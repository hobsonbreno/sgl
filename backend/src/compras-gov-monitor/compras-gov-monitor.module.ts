import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { Proposta, PropostaSchema } from '../proposta/proposta.schema';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { ComprasGovMonitorController } from './compras-gov-monitor.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Proposta.name, schema: PropostaSchema }]),
    ConfiguracaoModule
  ],
  controllers: [ComprasGovMonitorController],
  providers: [ComprasGovScraperService, ComprasGovMonitorService]
})
export class ComprasGovMonitorModule {}
