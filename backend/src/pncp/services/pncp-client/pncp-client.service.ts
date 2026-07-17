import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PncpContratacaoRawDto } from '../../dtos/pncp.dto';
import { catchError, firstValueFrom, retry, timer, throwError, of } from 'rxjs';
import { AxiosError } from 'axios';

export interface FiltroBuscaDto {
  dataFinal: string; // AAAAMMDD
  codigoModalidadeContratacao: number;
  uf?: string;
  codigoMunicipioIbge?: string;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

@Injectable()
export class PncpClientService {
  private readonly logger = new Logger(PncpClientService.name);
  private readonly baseUrl = process.env.PNCP_BASE_URL || 'https://pncp.gov.br/api/consulta';

  constructor(private readonly httpService: HttpService) {}

  async buscarContratacoesComPropostaAberta(filtros: FiltroBuscaDto): Promise<PncpContratacaoRawDto[]> {
    let pagina = 1;
    let totalPaginas = 1;
    const resultados: PncpContratacaoRawDto[] = [];

    while (pagina <= totalPaginas) {
      this.logger.log(`Buscando página ${pagina} para modalidade ${filtros.codigoModalidadeContratacao}...`);
      
      const response = await this.fazerRequisicaoComRetry('/v1/contratacoes/proposta', {
        ...filtros,
        pagina,
      });

      if (response && response.data) {
        const itens = response.data.data || [];
        resultados.push(...itens);
        totalPaginas = response.data.totalPaginas || 1;
      } else {
        break; // Sai do loop se não houver dados
      }

      pagina++;
      // Sleep for rate limit awareness (optional delay to prevent 429)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.logger.log(`Total encontrado para modalidade ${filtros.codigoModalidadeContratacao}: ${resultados.length}`);
    return resultados;
  }

  async buscarItensDaContratacao(numeroControlePNCP: string): Promise<any[]> {
    this.logger.log(`Buscando itens para a contratação: ${numeroControlePNCP}`);
    const parts = numeroControlePNCP.split('-');
    if (parts.length < 3) {
      this.logger.warn(`Número de controle inválido: ${numeroControlePNCP}`);
      return [];
    }
    
    // O endpoint exato pode ser /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens (Baseado em documentação comum do PNCP)
    // Usando a API de consulta (caso exista): /v1/contratacoes/{numeroControlePNCP}/itens
    // Será necessário confirmar no Swagger, aqui faremos um placeholder chamando um possível endpoint.
    const url = `/v1/contratacoes/${numeroControlePNCP}/itens`;
    
    try {
      const response = await this.fazerRequisicaoComRetry(url, {});
      return response?.data || [];
    } catch (e) {
      this.logger.error(`Erro ao buscar itens de ${numeroControlePNCP}: ${e.message}`);
      return [];
    }
  }

  private async fazerRequisicaoComRetry(endpoint: string, params: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return firstValueFrom(
      this.httpService.get(url, { params, timeout: 10000 }).pipe(
        retry({
          count: 2,
          delay: (error: AxiosError, retryCount: number) => {
            this.logger.warn(`Falha na requisição para ${url}. Tentativa ${retryCount}/2. Erro: ${error.message}`);
            if (error.response?.status === 429) {
              this.logger.warn('Rate limit atingido (429). Aguardando 5 segundos antes de tentar novamente...');
              return timer(5000 * retryCount);
            }
            return timer(2000 * retryCount);
          }
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`Erro fatal na requisição para ${url} após retries: ${error.message}`);
          return of({ data: { data: [], totalPaginas: 1 } }); // Retorna vazio para não derrubar o worker
        })
      )
    );
  }
}
