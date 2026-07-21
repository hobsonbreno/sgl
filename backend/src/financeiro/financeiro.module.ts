import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { TransacaoFinanceira, TransacaoFinanceiraSchema } from './financeiro.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TransacaoFinanceira.name, schema: TransacaoFinanceiraSchema }])
  ],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
  exports: [FinanceiroService]
})
export class FinanceiroModule {}
