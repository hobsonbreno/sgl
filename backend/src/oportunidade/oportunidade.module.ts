import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OportunidadeService } from './oportunidade.service';
import { OportunidadeController } from './oportunidade.controller';
import { Oportunidade, OportunidadeSchema } from './oportunidade.schema';
import { PncpModule } from '../pncp/pncp.module';
import { ProdutoModule } from '../produto/produto.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Oportunidade.name, schema: OportunidadeSchema },
    ]),
    PncpModule,
    forwardRef(() => ProdutoModule),
  ],
  controllers: [OportunidadeController],
  providers: [OportunidadeService],
  exports: [MongooseModule, OportunidadeService],
})
export class OportunidadeModule {}
