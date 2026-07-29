import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CnpjEnrichmentService } from './cnpj-enrichment.service';

@ApiTags('Fornecedores')
@Controller('fornecedores')
export class CnpjEnrichmentController {
  constructor(private readonly cnpjEnrichmentService: CnpjEnrichmentService) {}

  @Get('enriquecer-cnpj/:cnpj')
  @ApiOperation({
    summary: 'Enriquece dados de um fornecedor consultando a BrasilAPI',
  })
  async enriquecerCnpj(@Param('cnpj') cnpj: string) {
    const data = await this.cnpjEnrichmentService.enrichCnpj(cnpj);
    if (!data) return { found: false };

    // Formata o payload para uso no formulário do frontend
    return {
      found: true,
      razaoSocial: data.razao_social || data.nome_fantasia || '',
      categorias: data.cnae_fiscal_descricao || '',
      telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
      email: data.email || '',
      cep: data.cep || '',
      endereco: data.logradouro
        ? `${data.logradouro}, ${data.numero || 'SN'}`
        : '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
    };
  }
}
