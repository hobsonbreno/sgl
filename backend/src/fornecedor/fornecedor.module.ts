import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FornecedorService } from './fornecedor.service';
import { Fornecedor, FornecedorSchema } from './fornecedor.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Fornecedor.name, schema: FornecedorSchema }])],
  providers: [FornecedorService],
  exports: [MongooseModule, FornecedorService],
})
export class FornecedorModule {}
