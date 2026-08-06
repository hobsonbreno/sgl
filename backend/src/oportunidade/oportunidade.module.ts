import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OportunidadeService } from './oportunidade.service';
import { OportunidadeController } from './oportunidade.controller';
import { Oportunidade, OportunidadeSchema } from './oportunidade.schema';
import { OportunidadeGateway } from './oportunidade.gateway';
import {
  SimulacaoEstrategia,
  SimulacaoSchema,
} from './schemas/simulacao.schema';
import { PncpModule } from '../pncp/pncp.module';
import { ProdutoModule } from '../produto/produto.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { Cotacao, CotacaoSchema } from '../cotacao/cotacao.schema';
import { SefazCeModule } from '../sefaz-ce/sefaz-ce.module';

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
    SefazCeModule,
  ],
  controllers: [OportunidadeController],
  providers: [OportunidadeService, OportunidadeGateway],
  exports: [MongooseModule, OportunidadeService, OportunidadeGateway],
})
export class OportunidadeModule {}
