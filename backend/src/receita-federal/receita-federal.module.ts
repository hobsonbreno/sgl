import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReceitaFederalService } from './receita-federal.service';
import { EmpresaDataLake, EmpresaDataLakeSchema } from './receita-federal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EmpresaDataLake.name, schema: EmpresaDataLakeSchema }]),
  ],
  providers: [ReceitaFederalService],
  exports: [ReceitaFederalService, MongooseModule]
})
export class ReceitaFederalModule {}
