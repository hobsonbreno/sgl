import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Proposta, PropostaSchema } from './proposta.schema';
import { PropostaService } from './proposta.service';
import { PropostaController } from './proposta.controller';
import { Cotacao, CotacaoSchema } from '../cotacao/cotacao.schema';
import { Oportunidade, OportunidadeSchema } from '../oportunidade/oportunidade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proposta.name, schema: PropostaSchema },
      { name: Cotacao.name, schema: CotacaoSchema },
      { name: Oportunidade.name, schema: OportunidadeSchema },
    ]),
  ],
  controllers: [PropostaController],
  providers: [PropostaService],
  exports: [PropostaService],
})
export class PropostaModule {}
