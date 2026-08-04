import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProdutoService } from './produto.service';
import { ProdutoController } from './produto.controller';
import { Produto, ProdutoSchema } from './produto.schema';
import { ProdutoGateway } from './produto.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Produto.name, schema: ProdutoSchema }]),
  ],
  controllers: [ProdutoController],
  providers: [ProdutoService, ProdutoGateway],
  exports: [MongooseModule, ProdutoService, ProdutoGateway],
})
export class ProdutoModule {}
