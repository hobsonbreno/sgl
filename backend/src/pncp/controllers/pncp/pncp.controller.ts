import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PncpClientService } from '../../services/pncp-client/pncp-client.service';
import { mapPncpParaOportunidade, OportunidadeDto } from '../../dtos/pncp.dto';

@ApiTags('PNCP Testes')
@Controller('pncp')
export class PncpController {
  constructor(private readonly pncpClientService: PncpClientService) {}

  @Get('test-busca')
  @ApiOperation({ summary: 'Testa a busca de oportunidades no PNCP (sem salvar no banco)' })
  @ApiQuery({ name: 'uf', required: false, description: 'Sigla da UF (ex: CE)' })
  @ApiQuery({ name: 'modalidade', required: true, description: 'Código da Modalidade (ex: 6 para Pregão Eletrônico)', type: Number })
  @ApiQuery({ name: 'dias', required: false, description: 'Dias no futuro para a data final', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de oportunidades mapeadas', type: [OportunidadeDto] })
  async testBusca(
    @Query('modalidade') modalidade: number,
    @Query('uf') uf?: string,
    @Query('dias') dias: number = 10,
  ): Promise<OportunidadeDto[]> {
    
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + Number(dias));
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    const dataFinal = `${yyyy}${mm}${dd}`;

    const rawResult = await this.pncpClientService.buscarContratacoesComPropostaAberta({
      dataFinal,
      codigoModalidadeContratacao: Number(modalidade),
      uf,
    });

    return rawResult.map(raw => mapPncpParaOportunidade(raw));
  }
}
