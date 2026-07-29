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
import {
  ProdutoCnaeMap,
  ProdutoCnaeMapSchema,
} from './produto-cnae-map.schema';
import { ProductMatchingService } from './product-matching.service';
import { CnpjEnrichmentService } from './cnpj-enrichment.service';
import { CnpjEnrichmentController } from './cnpj-enrichment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fornecedor.name, schema: FornecedorSchema },
      { name: ProdutoBase.name, schema: ProdutoBaseSchema },
      { name: ProdutoCnaeMap.name, schema: ProdutoCnaeMapSchema },
    ]),
    PerfilBuscaModule,
    ReceitaFederalModule,
  ],
  controllers: [FornecedorController, CnpjEnrichmentController],
  providers: [
    FornecedorService,
    SupplierDiscoveryService,
    ProductMatchingService,
    CnpjEnrichmentService,
  ],
  exports: [
    MongooseModule,
    FornecedorService,
    SupplierDiscoveryService,
    ProductMatchingService,
    CnpjEnrichmentService,
  ],
})
export class FornecedorModule {}
