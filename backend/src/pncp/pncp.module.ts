import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PncpClientService } from './services/pncp-client/pncp-client.service';
import { PncpController } from './controllers/pncp/pncp.controller';
import { ComprasDadosAbertosService } from './services/compras-dados-abertos/compras-dados-abertos.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Oportunidade, OportunidadeSchema } from '../oportunidade/oportunidade.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Oportunidade.name, schema: OportunidadeSchema }])
  ],
  providers: [PncpClientService, ComprasDadosAbertosService],
  controllers: [PncpController],
  exports: [PncpClientService, ComprasDadosAbertosService],
})
export class PncpModule {}
