import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CotacaoService } from './cotacao.service';

export class UpdatePrecoDto {
  fornecedorId: string;
  precoUnitario: number;
  fatorEmbalagem?: number;
  precoEmbalagem?: number;
  nomeEmbalagem?: string;
  freteIncluso?: boolean;
  prazoPagamento?: number;
  permiteParcelamento?: boolean;
  observacao?: string;
  desclassificado?: boolean;
}

export class CreateCotacaoDto {
  itens?: any[];
}

@ApiTags('Cotações')
@Controller()
export class CotacaoController {
  constructor(private readonly cotacaoService: CotacaoService) {}

  @Post('oportunidades/:id/cotacao')
  @ApiOperation({ summary: 'Criar ou obter cotação para uma oportunidade' })
  createOrGet(
    @Param('id') oportunidadeId: string,
    @Body() data: CreateCotacaoDto,
  ) {
    return this.cotacaoService.createOrGet(oportunidadeId, data.itens);
  }

  @Get('oportunidades/:id/cotacao')
  @ApiOperation({ summary: 'Obter cotação por Oportunidade ID' })
  async findByOportunidade(@Param('id') oportunidadeId: string) {
    try {
      return await this.cotacaoService.findByOportunidade(oportunidadeId);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  @Get('cotacoes/:id')
  @ApiOperation({ summary: 'Obter cotação por ID' })
  findOne(@Param('id') id: string) {
    return this.cotacaoService.findOne(id);
  }

  @Patch('cotacoes/:id/itens/:itemId/preco')
  @ApiOperation({
    summary: 'Atualizar ou adicionar preço de fornecedor para um item',
  })
  updatePreco(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: UpdatePrecoDto,
  ) {
    return this.cotacaoService.updatePreco(id, itemId, data);
  }

  @Delete('cotacoes/:id/itens/:itemId/preco/:fornecedorId')
  @ApiOperation({ summary: 'Remover preço de um fornecedor para um item' })
  removePreco(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Param('fornecedorId') fornecedorId: string,
  ) {
    return this.cotacaoService.removePreco(id, itemId, fornecedorId);
  }

  @Post('cotacoes/:id/itens/:itemId/buscar-web')
  @ApiOperation({ summary: 'Buscar preços na web automaticamente para o item' })
  buscarPrecosWeb(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body?: { location?: string },
  ) {
    return this.cotacaoService.buscarPrecosWebAuto(id, itemId, body?.location);
  }
}
