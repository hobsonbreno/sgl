import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OportunidadeService } from './oportunidade.service';
import { OportunidadeController } from './oportunidade.controller';
import { Oportunidade, OportunidadeSchema } from './oportunidade.schema';
import {
  SimulacaoEstrategia,
  SimulacaoSchema,
} from './schemas/simulacao.schema';
import { PncpModule } from '../pncp/pncp.module';
import { ProdutoModule } from '../produto/produto.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { Cotacao, CotacaoSchema } from '../cotacao/cotacao.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Oportunidade.name, schema: OportunidadeSchema },
      { name: SimulacaoEstrategia.name, schema: SimulacaoSchema },
      { name: Cotacao.name, schema: CotacaoSchema },
    ]),
    PncpModule,
    forwardRef(() => ProdutoModule),
    forwardRef(() => FinanceiroModule),
  ],
  controllers: [OportunidadeController],
  providers: [OportunidadeService],
  exports: [MongooseModule, OportunidadeService],
})
export class OportunidadeModule {}
