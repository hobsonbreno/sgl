import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Categoria, CategoriaSchema } from './categoria.schema';
import { CategoriaService } from './categoria.service';
import { CategoriaController } from './categoria.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Categoria.name, schema: CategoriaSchema }]),
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService],
  exports: [CategoriaService],
})
export class CategoriaModule {}
