import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import {
  TransacaoFinanceira,
  TransacaoFinanceiraSchema,
} from './financeiro.schema';
import {
  Oportunidade,
  OportunidadeSchema,
} from '../oportunidade/oportunidade.schema';
import { Produto, ProdutoSchema } from '../produto/produto.schema';

import { Cotacao, CotacaoSchema } from '../cotacao/cotacao.schema';
import { FinanceiroGateway } from './financeiro.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransacaoFinanceira.name, schema: TransacaoFinanceiraSchema },
      { name: Oportunidade.name, schema: OportunidadeSchema },
      { name: Produto.name, schema: ProdutoSchema },
      { name: Cotacao.name, schema: CotacaoSchema },
    ]),
  ],
  controllers: [FinanceiroController],
  providers: [FinanceiroService, FinanceiroGateway],
  exports: [FinanceiroService, FinanceiroGateway],
})
export class FinanceiroModule {}
