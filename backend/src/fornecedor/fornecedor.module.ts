import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FornecedorService } from './fornecedor.service';
import { FornecedorController } from './fornecedor.controller';
import { Fornecedor, FornecedorSchema, ProdutoBase, ProdutoBaseSchema } from './fornecedor.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Fornecedor.name, schema: FornecedorSchema },
    { name: ProdutoBase.name, schema: ProdutoBaseSchema }
  ])],
  controllers: [FornecedorController],
  providers: [FornecedorService],
  exports: [MongooseModule, FornecedorService],
})
export class FornecedorModule {}
