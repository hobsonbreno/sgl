import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgaoService } from './orgao.service';
import { OrgaoController } from './orgao.controller';
import { Orgao, OrgaoSchema } from './orgao.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Orgao.name, schema: OrgaoSchema }])],
  controllers: [OrgaoController],
  providers: [OrgaoService],
  exports: [MongooseModule, OrgaoService],
})
export class OrgaoModule {}
