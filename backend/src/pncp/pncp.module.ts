import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PncpClientService } from './services/pncp-client/pncp-client.service';
import { PncpController } from './controllers/pncp/pncp.controller';
import { ComprasDadosAbertosService } from './services/compras-dados-abertos/compras-dados-abertos.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Oportunidade,
  OportunidadeSchema,
} from '../oportunidade/oportunidade.schema';
import { Produto, ProdutoSchema } from '../produto/produto.schema';
import { ResultadoItem, ResultadoItemSchema } from './schemas/resultado-item.schema';
import { ResultadoItemCollectorService } from './services/resultado-item-collector/resultado-item-collector.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Oportunidade.name, schema: OportunidadeSchema },
      { name: Produto.name, schema: ProdutoSchema },
      { name: ResultadoItem.name, schema: ResultadoItemSchema },
    ]),
  ],
  providers: [PncpClientService, ComprasDadosAbertosService, ResultadoItemCollectorService],
  controllers: [PncpController],
  exports: [PncpClientService, ComprasDadosAbertosService],
})
export class PncpModule {}
