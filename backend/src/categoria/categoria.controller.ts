import { Controller, Get } from '@nestjs/common';
import { CategoriaService } from './categoria.service';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Get()
  async getCategorias() {
    return this.categoriaService.getCategorias();
  }
}
