import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OportunidadeService } from './oportunidade.service';
import { OportunidadeController } from './oportunidade.controller';
import { Oportunidade, OportunidadeSchema } from './oportunidade.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Oportunidade.name, schema: OportunidadeSchema }])],
  controllers: [OportunidadeController],
  providers: [OportunidadeService],
  exports: [MongooseModule, OportunidadeService],
})
export class OportunidadeModule {}
