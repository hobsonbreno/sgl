import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PncpClientService } from '../../services/pncp-client/pncp-client.service';
import { ComprasDadosAbertosService } from '../../services/compras-dados-abertos/compras-dados-abertos.service';
import { mapPncpParaOportunidade, OportunidadeDto } from '../../dtos/pncp.dto';

@ApiTags('PNCP Testes')
@Controller('pncp')
export class PncpController {
  constructor(
    private readonly pncpClientService: PncpClientService,
    private readonly comprasDadosAbertosService: ComprasDadosAbertosService,
  ) {}

  @Get('inteligencia-precos')
  @ApiOperation({
    summary:
      'Busca histórico de preços de contratos para inteligência competitiva',
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: 'Palavra-chave do produto (ex: Frango)',
  })
  @ApiQuery({
    name: 'uf',
    required: true,
    description: 'Sigla do Estado (ex: CE)',
  })
  async inteligenciaPrecos(
    @Query('keyword') keyword: string,
    @Query('uf') uf: string,
  ) {
    return this.comprasDadosAbertosService.pesquisarHistoricoPrecos(
      keyword,
      uf,
    );
  }

  @Get('test-busca')
  @ApiOperation({
    summary: 'Testa a busca de oportunidades no PNCP (sem salvar no banco)',
  })
  @ApiQuery({
    name: 'uf',
    required: false,
    description: 'Sigla da UF (ex: CE)',
  })
  @ApiQuery({
    name: 'modalidade',
    required: true,
    description: 'Código da Modalidade (ex: 6 para Pregão Eletrônico)',
    type: Number,
  })
  @ApiQuery({
    name: 'dias',
    required: false,
    description: 'Dias no futuro para a data final',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de oportunidades mapeadas',
    type: [OportunidadeDto],
  })
  async testBusca(
    @Query('modalidade') modalidade: number,
    @Query('uf') uf?: string,
    @Query('dias') dias: number = 10,
  ): Promise<OportunidadeDto[]> {
    const hojeFinal = new Date();
    hojeFinal.setDate(hojeFinal.getDate() + Number(dias));
    const yyyyF = hojeFinal.getFullYear();
    const mmF = String(hojeFinal.getMonth() + 1).padStart(2, '0');
    const ddF = String(hojeFinal.getDate()).padStart(2, '0');
    const dataFinal = `${yyyyF}${mmF}${ddF}`;

    const hojeInicial = new Date();
    hojeInicial.setDate(hojeInicial.getDate() - 30);
    const yyyyI = hojeInicial.getFullYear();
    const mmI = String(hojeInicial.getMonth() + 1).padStart(2, '0');
    const ddI = String(hojeInicial.getDate()).padStart(2, '0');
    const dataInicial = `${yyyyI}${mmI}${ddI}`;

    const rawResult =
      await this.pncpClientService.buscarContratacoesComPropostaAberta({
        dataInicial,
        dataFinal,
        codigoModalidadeContratacao: Number(modalidade),
        uf,
      });

    return rawResult.map((raw) => mapPncpParaOportunidade(raw));
  }
}
