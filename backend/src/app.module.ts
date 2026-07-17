import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PncpModule } from './pncp/pncp.module';
import { PerfilBuscaModule } from './perfil-busca/perfil-busca.module';
import { FornecedorModule } from './fornecedor/fornecedor.module';
import { OportunidadeModule } from './oportunidade/oportunidade.module';
import { BotModule } from './bot/bot.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CotacaoModule } from './cotacao/cotacao.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://mongo:27017/licitacoes'),
    ScheduleModule.forRoot(),
    PncpModule,
    PerfilBuscaModule,
    FornecedorModule,
    OportunidadeModule,
    BotModule,
    DashboardModule,
    CotacaoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
