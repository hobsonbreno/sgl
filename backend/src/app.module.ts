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
import { OrgaoModule } from './orgao/orgao.module';
import { ProdutoModule } from './produto/produto.module';
import { PropostaModule } from './proposta/proposta.module';
import { ConfiguracaoModule } from './configuracao/configuracao.module';
import { EventsModule } from './events/events.module';
import { FinanceiroModule } from './financeiro/financeiro.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongo:27017/licitacoes',
    ),
    ScheduleModule.forRoot(),
    PncpModule,
    PerfilBuscaModule,
    FornecedorModule,
    OportunidadeModule,
    BotModule,
    DashboardModule,
    CotacaoModule,
    OrgaoModule,
    ProdutoModule,
    PropostaModule,
    ConfiguracaoModule,
    EventsModule,
    FinanceiroModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
