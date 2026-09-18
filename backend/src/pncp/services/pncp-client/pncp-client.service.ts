import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PncpContratacaoRawDto } from '../../dtos/pncp.dto';
import { catchError, firstValueFrom, retry, timer, of } from 'rxjs';
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

  private activeRequests = 0;
  private readonly MAX_CONCURRENT = 5;
  private readonly MIN_DELAY = 150;

  private async waitForCapacity(): Promise<void> {
    while (this.activeRequests >= this.MAX_CONCURRENT) {
      /* istanbul ignore next */
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.activeRequests++;
    await new Promise((resolve) => setTimeout(resolve, this.MIN_DELAY));
  }

  constructor(private readonly httpService: HttpService) {}

  private async enfileirarRequisicao<T>(url: string, params?: any): Promise<T> {
    this.logger.log(
      `[PNCP_QUEUE] Enfileirando req para: ${url} (Ativos: ${this.activeRequests}/${this.MAX_CONCURRENT})`,
    );
    const start = Date.now();
    await this.waitForCapacity();
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { params, timeout: 90000 }).pipe(
          /* istanbul ignore next */
          retry({
            count: 5,
            delay: /* istanbul ignore next */ (error: AxiosError, retryCount: number) => {
              if (
                error.response?.status === 404 ||
                error.response?.status === 400
              ) {
                throw error;
              }
              if (
                error.response?.status === 429 ||
                error.code === 'ECONNABORTED' ||
                error.message.includes('timeout')
              ) {
                const backoff = Math.min(
                  10000 * Math.pow(2, retryCount - 1),
                  60000,
                ); // 10s, 20s, 40s, 60s
                this.logger.warn(
                  `[PNCP_QUEUE] Rate limit/Timeout em ${url}! Aguardando ${backoff / 1000}s (Tentativa ${retryCount}/5)...`,
                );
                return timer(backoff);
              }
              /* istanbul ignore next */
              this.logger.warn(
                `[PNCP_QUEUE] Falha ${retryCount}/5 em ${url}: ${error.message}`,
              );
              return timer(2000 * retryCount);
            },
          }),
            catchError(/* istanbul ignore next */ (error: AxiosError) => {
              if (error.response && error.response.status === 404) {
                return of({ data: null });
              }
              throw error;
            }),
        ),
      );
      this.logger.log(`[PNCP_QUEUE] Sucesso ${url} em ${Date.now() - start}ms`);
      return response?.data || null;
    } finally {
      this.activeRequests--;
    }
  }

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

      const dataPayload = await this.enfileirarRequisicao<any>(
        `${this.baseUrl}/v1/contratacoes/proposta`,
        {
          ...filtros,
          pagina,
        },
      );

      if (dataPayload) {
        const itens: any[] = dataPayload.data || [];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resultados.push(...itens);
        totalPaginas = dataPayload.totalPaginas || 1;
      } else {
        break; // Sai do loop se não houver dados
      }

      pagina++;
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
    /* istanbul ignore next */
    if (!ano) return [];

    const splitDash = cnpjESeq.split('-');
    /* istanbul ignore next */
    if (splitDash.length < 3) return [];

    const cnpj = splitDash[0];
    const sequencial = splitDash[2];

    const baseUrlConsulta = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
    const baseUrlPncp = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;

    try {
      let todosItens = await this.executarBuscaPaginada(baseUrlConsulta);
      if (todosItens.length === 0) {
        this.logger.log(
          `API de consulta retornou 0 itens para ${numeroControlePNCP}. Tentando API de integração PNCP.`,
        );
        todosItens = await this.executarBuscaPaginada(baseUrlPncp);
      }
      return todosItens;
    } catch (e) {
      /* istanbul ignore next */
      this.logger.error(
        `Erro ao buscar itens de ${numeroControlePNCP}: ${e.message}`,
      );
      /* istanbul ignore next */
      throw e; // Rethrow to let the caller handle it (e.g. OportunidadeController)
    }
  }

  private async executarBuscaPaginada(baseUrl: string): Promise<any[]> {
    let todosItens: any[] = [];
    let pagina = 1;
    const tamanhoPagina = 50;
    let temMais = true;

    while (temMais) {
      const url = `${baseUrl}?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
      const data = await this.enfileirarRequisicao<any>(url);

      const itensDaPagina = data || [];
      todosItens = todosItens.concat(itensDaPagina);

      if (itensDaPagina.length < tamanhoPagina) {
        temMais = false;
      } else {
        pagina++;
      }
    }
    return todosItens;
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
    /* istanbul ignore next */
    if (!ano) return [];

    const splitDash = cnpjESeq.split('-');
    /* istanbul ignore next */
    if (splitDash.length < 3) return [];

    const cnpj = splitDash[0];
    const sequencial = splitDash[2];

    const baseUrl = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens/${numeroItem}/resultados`;

    try {
      let todosResultados: any[] = [];
      let pagina = 1;
      const tamanhoPagina = 50;
      let temMais = true;

      while (temMais) {
        const url = `${baseUrl}?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
        const data = await this.enfileirarRequisicao<any>(url);

        const resultadosDaPagina = data || [];
        todosResultados = todosResultados.concat(resultadosDaPagina);

        if (resultadosDaPagina.length < tamanhoPagina) {
          temMais = false;
        } else {
          pagina++;
        }
      }
      return todosResultados;
    } catch (e) {
      /* istanbul ignore next */
      if (e.response && e.response.status === 404) {
        // Normal se não houver resultado ainda
        return [];
      }
      /* istanbul ignore next */
      this.logger.error(
        `Erro ao buscar resultados do item ${numeroItem} de ${numeroControlePNCP}: ${e.message}`,
      );
      /* istanbul ignore next */
      return [];
    }
  }

  async buscarContratacaoEspecifica(
    cnpj: string,
    ano: string,
    sequencial: string,
  ): Promise<any> {
    this.logger.log(
      `Buscando contratacao especifica: CNPJ ${cnpj}, Ano ${ano}, Seq ${sequencial}`,
    );
    const url = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`;

    try {
      const data = await this.enfileirarRequisicao<any>(url);
      return data;
    } catch (e) {
      /* istanbul ignore next */
      this.logger.error(
        `Erro ao buscar contratacao ${cnpj}/${ano}/${sequencial}: ${e.message}`,
      );
      /* istanbul ignore next */
      throw e;
    }
  }

  async buscarContratacaoPorUrlOuControle(input: string): Promise<any> {
    let cnpj = '';
    let ano = '';
    let sequencial = '';

    // Formato URL: https://pncp.gov.br/app/editais/00394494000136/2024/616
    if (input.includes('pncp.gov.br/app/editais/')) {
      const parts = input.split('editais/')[1].split('/');
      /* istanbul ignore next */
      if (parts.length >= 3) {
        cnpj = parts[0];
        ano = parts[1];
        sequencial = parts[2].split('?')[0]; // remove query params if any
      }
    }
    // Formato Numero Controle: 00394494000136-1-000616/2024
    else if (input.includes('-') && input.includes('/')) {
      const [cnpjESeq, a] = input.split('/');
      ano = a;
      const splitDash = cnpjESeq.split('-');
      /* istanbul ignore next */
      if (splitDash.length >= 3) {
        cnpj = splitDash[0];
        sequencial = splitDash[2];
      }
    }

    if (!cnpj || !ano || !sequencial) {
      throw new Error(
        'Formato de Link ou Número de Controle do PNCP inválido.',
      );
    }

    return this.buscarContratacaoEspecifica(cnpj, ano, sequencial);
  }
}
