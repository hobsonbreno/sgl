import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FornecedorService } from './fornecedor.service';

export class CreateFornecedorDto {
  razaoSocial: string;
  cnpj: string;
  contato?: { nome: string; telefone: string; email: string }[];
  categorias?: string[];
}

@ApiTags('Fornecedores')
@Controller('fornecedores')
export class FornecedorController {
  constructor(private readonly service: FornecedorService) {}

  @Post()
  @ApiOperation({ summary: 'Criar fornecedor manualmente' })
  create(@Body() data: CreateFornecedorDto) {
    return this.service.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar fornecedores (com paginação e busca)' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }
}
