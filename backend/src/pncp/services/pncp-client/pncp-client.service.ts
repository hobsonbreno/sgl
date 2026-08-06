import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PncpContratacaoRawDto } from '../../dtos/pncp.dto';
import { catchError, firstValueFrom, retry, timer } from 'rxjs';
import { AxiosError } from 'axios';

export interface FiltroBuscaDto {
  dataInicial: string; // AAAAMMDD
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
  private readonly baseUrl =
    process.env.PNCP_BASE_URL || 'https://pncp.gov.br/api/consulta';

  constructor(private readonly httpService: HttpService) {}

  async buscarContratacoesComPropostaAberta(
    filtros: FiltroBuscaDto,
  ): Promise<PncpContratacaoRawDto[]> {
    let pagina = 1;
    let totalPaginas = 1;
    const resultados: PncpContratacaoRawDto[] = [];

    while (pagina <= totalPaginas) {
      this.logger.log(
        `Buscando página ${pagina} para modalidade ${filtros.codigoModalidadeContratacao}...`,
      );

      const response = await this.fazerRequisicaoComRetry(
        '/v1/contratacoes/proposta',
        {
          ...filtros,
          pagina,
        },
      );

      if (response && response.data) {
        const itens = response.data.data || [];
        resultados.push(...itens);
        totalPaginas = response.data.totalPaginas || 1;
      } else {
        break; // Sai do loop se não houver dados
      }

      pagina++;
      // Sleep for rate limit awareness - increased to 1.5s per page to prevent 429
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    this.logger.log(
      `Total encontrado para modalidade ${filtros.codigoModalidadeContratacao}: ${resultados.length}`,
    );
    return resultados;
  }

  async buscarItensDaContratacao(numeroControlePNCP: string): Promise<any[]> {
    this.logger.log(`Buscando itens para a contratação: ${numeroControlePNCP}`);
    const parts = numeroControlePNCP.split('-');
    if (parts.length < 3) {
      this.logger.warn(`Número de controle inválido: ${numeroControlePNCP}`);
      return [];
    }

    // numeroControlePNCP no formato: {cnpj}-1-{sequencial}/{ano}
    // Ex: "00394494000136-1-000616/2024"
    const [cnpjESeq, ano] = numeroControlePNCP.split('/');
    if (!ano) return [];

    const splitDash = cnpjESeq.split('-');
    if (splitDash.length < 3) return [];

    const cnpj = splitDash[0];
    const sequencial = splitDash[2];

    const baseUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;

    try {
      let todosItens: any[] = [];
      let pagina = 1;
      const tamanhoPagina = 500;
      let temMais = true;

      while (temMais) {
        const url = `${baseUrl}?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
        const response = await firstValueFrom(
          this.httpService.get(url, { timeout: 60000 }).pipe(
            retry({
              count: 2,
              delay: (error: AxiosError, retryCount: number) => {
                this.logger.warn(
                  `Falha na requisição para ${url}. Tentativa ${retryCount}/2. Erro: ${error.message}`,
                );
                return timer(2000 * retryCount);
              },
            }),
          ),
        );

        const itensDaPagina = response?.data || [];
        todosItens = todosItens.concat(itensDaPagina);

        if (itensDaPagina.length < tamanhoPagina) {
          temMais = false;
        } else {
          pagina++;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      return todosItens;
    } catch (e) {
      this.logger.error(
        `Erro ao buscar itens de ${numeroControlePNCP}: ${e.message}`,
      );
      throw e; // Rethrow to let the caller handle it (e.g. OportunidadeController)
    }
  }

  async buscarResultadosDoItem(
    numeroControlePNCP: string,
    numeroItem: number,
  ): Promise<any[]> {
    this.logger.log(
      `Buscando resultados para o item ${numeroItem} da contratação: ${numeroControlePNCP}`,
    );
    const parts = numeroControlePNCP.split('-');
    if (parts.length < 3) return [];

    const [cnpjESeq, ano] = numeroControlePNCP.split('/');
    if (!ano) return [];

    const splitDash = cnpjESeq.split('-');
    if (splitDash.length < 3) return [];

    const cnpj = splitDash[0];
    const sequencial = splitDash[2];

    const baseUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens/${numeroItem}/resultados`;

    try {
      let todosResultados: any[] = [];
      let pagina = 1;
      const tamanhoPagina = 50;
      let temMais = true;

      while (temMais) {
        const url = `${baseUrl}?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
        const response = await firstValueFrom(
          this.httpService.get(url, { timeout: 60000 }).pipe(
            retry({
              count: 2,
              delay: (error: AxiosError, retryCount: number) => {
                this.logger.warn(
                  `Falha ao buscar resultados para ${url}. Tentativa ${retryCount}/2.`,
                );
                return timer(2000 * retryCount);
              },
            }),
          ),
        );

        const resultadosDaPagina = response?.data || [];
        todosResultados = todosResultados.concat(resultadosDaPagina);

        if (resultadosDaPagina.length < tamanhoPagina) {
          temMais = false;
        } else {
          pagina++;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      return todosResultados;
    } catch (e) {
      if (e.response && e.response.status === 404) {
        // Normal se não houver resultado ainda
        return [];
      }
      this.logger.error(
        `Erro ao buscar resultados do item ${numeroItem} de ${numeroControlePNCP}: ${e.message}`,
      );
      return [];
    }
  }

  private async fazerRequisicaoComRetry(
    endpoint: string,
    params: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    return firstValueFrom(
      this.httpService.get(url, { params, timeout: 60000 }).pipe(
        retry({
          count: 5,
          delay: (error: AxiosError, retryCount: number) => {
            this.logger.warn(
              `Falha na requisição para ${url}. Tentativa ${retryCount}/5. Erro: ${error.message}`,
            );
            if (error.response?.status === 429) {
              this.logger.warn(
                `Rate limit atingido (429). Aguardando ${10 * retryCount} segundos antes de tentar novamente...`,
              );
              return timer(10000 * retryCount); // Backoff: 10s, 20s, 30s...
            }
            return timer(5000 * retryCount);
          },
        }),
        catchError((error: AxiosError) => {
          this.logger.error(
            `Erro fatal na requisição para ${url} após retries: ${error.message}`,
          );
          throw error; // Não retorna of() vazio, lança para o loop principal decidir se para
        }),
      ),
    );
  }
}
