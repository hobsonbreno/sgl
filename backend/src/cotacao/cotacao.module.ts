import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CotacaoService } from './cotacao.service';
import { CotacaoController } from './cotacao.controller';
import { Cotacao, CotacaoSchema } from './cotacao.schema';
import { FornecedorModule } from '../fornecedor/fornecedor.module';
import { PerfilBuscaModule } from '../perfil-busca/perfil-busca.module';
import { CotacaoGateway } from './cotacao.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cotacao.name, schema: CotacaoSchema }]),
    FornecedorModule,
    PerfilBuscaModule,
  ],
  providers: [CotacaoService, CotacaoGateway],
  controllers: [CotacaoController],
  exports: [CotacaoGateway],
})
export class CotacaoModule {}
