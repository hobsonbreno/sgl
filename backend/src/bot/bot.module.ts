import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { BotExecucao, BotExecucaoSchema } from './bot-execucao.schema';
import { PncpModule } from '../pncp/pncp.module';
import { PerfilBuscaModule } from '../perfil-busca/perfil-busca.module';
import { FornecedorModule } from '../fornecedor/fornecedor.module';
import { OportunidadeModule } from '../oportunidade/oportunidade.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BotExecucao.name, schema: BotExecucaoSchema }]),
    PncpModule,
    PerfilBuscaModule,
    FornecedorModule,
    OportunidadeModule,
  ],
  providers: [BotService],
  controllers: [BotController]
})
export class BotModule {}
