import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FornecedorService } from './fornecedor.service';
import { SupplierDiscoveryService } from './supplier-discovery.service';
import { FornecedorController } from './fornecedor.controller';
import { PerfilBuscaModule } from '../perfil-busca/perfil-busca.module';
import { ReceitaFederalModule } from '../receita-federal/receita-federal.module';
import {
  Fornecedor,
  FornecedorSchema,
  ProdutoBase,
  ProdutoBaseSchema,
} from './fornecedor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fornecedor.name, schema: FornecedorSchema },
      { name: ProdutoBase.name, schema: ProdutoBaseSchema },
    ]),
    PerfilBuscaModule,
    ReceitaFederalModule,
  ],
  controllers: [FornecedorController],
  providers: [FornecedorService, SupplierDiscoveryService],
  exports: [MongooseModule, FornecedorService, SupplierDiscoveryService],
})
export class FornecedorModule {}
