import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerfilBuscaService } from './perfil-busca.service';
import { PerfilBuscaController } from './perfil-busca.controller';
import { PerfilBusca, PerfilBuscaSchema } from './perfil-busca.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PerfilBusca.name, schema: PerfilBuscaSchema }])],
  providers: [PerfilBuscaService],
  controllers: [PerfilBuscaController],
  exports: [MongooseModule],
})
export class PerfilBuscaModule {}
