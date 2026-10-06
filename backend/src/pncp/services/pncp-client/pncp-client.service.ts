import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PncpContratacaoRawDto } from '../../dtos/pncp.dto';
import { catchError, firstValueFrom, of } from 'rxjs';
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
  private backgroundRequests = 0;
  private readonly MAX_CONCURRENT = 5;
  private readonly MAX_BACKGROUND = 2; // Semáforo global para itens/resultados
  private readonly MIN_DELAY = 150;

  private async waitForCapacity(isBackground = false): Promise<void> {
    while (true) {
      if (this.activeRequests < this.MAX_CONCURRENT) {
        if (!isBackground) break;
        if (isBackground && this.backgroundRequests < this.MAX_BACKGROUND)
          break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.activeRequests++;
    if (isBackground) this.backgroundRequests++;
    await new Promise((resolve) => setTimeout(resolve, this.MIN_DELAY));
  }

  constructor(private readonly httpService: HttpService) {}

  private async enfileirarRequisicao<T>(
    url: string,
    params?: any,
    isBackground = false,
  ): Promise<T> {
    const maxTentativas = 5;
    let tentativa = 1;

    while (tentativa <= maxTentativas) {
      const queueWaitStart = Date.now();
      await this.waitForCapacity(isBackground);
      const queueWaitMs = Date.now() - queueWaitStart;

      this.logger.log(
        `[PNCP_QUEUE] Iniciando req para: ${url} após aguardar ${queueWaitMs}ms na fila (Tentativa ${tentativa}/${maxTentativas})`,
      );

      const start = Date.now();
      let response: any;
      let errorEncountered: any;

      try {
        response = await firstValueFrom(
          this.httpService.get(url, { params, timeout: 60000 }).pipe(
            catchError((error: AxiosError) => {
              if (error.response && error.response.status === 404) {
                return of({ data: null, status: 404 });
              }
              throw error;
            }),
          ),
        );
      } catch (err: any) {
        errorEncountered = err;
      } finally {
        this.activeRequests--;
        if (isBackground) this.backgroundRequests--;
      }

      if (!errorEncountered) {
        const itemCount = response?.data?.data
          ? response.data.data.length
          : response?.data?.length || 0;
        this.logger.log(
          `[PNCP_QUEUE] Sucesso ${url} em ${Date.now() - start}ms (fila: ${queueWaitMs}ms) | Status HTTP: ${response?.status} | Itens recebidos: ${itemCount}`,
        );
        return response?.data || null;
      }

      const status = errorEncountered.response?.status;
      const isRetriable = !status || status === 429 || status >= 500;

      if (!isRetriable || tentativa === maxTentativas) {
        throw errorEncountered;
      }

      const backoff = Math.min(10000 * Math.pow(2, tentativa - 1), 60000);
      this.logger.warn(
        `[PNCP_QUEUE] Falha retentável (${status || errorEncountered.code || errorEncountered.message}) em ${url}. Aguardando ${backoff / 1000}s FORA DO SLOT...`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      tentativa++;
    }

    throw new Error(`Falha crítica na requisição ${url}`);
  }

  async buscarContratacoesComPropostaAberta(
    filtros: FiltroBuscaDto,
    signal?: AbortSignal,
  ): Promise<{
    resultados: PncpContratacaoRawDto[];
    parcial: boolean;
    paginasComFalha: number;
  }> {
    const resultados: PncpContratacaoRawDto[] = [];

    this.logger.log(
      `[PNCP] Buscando consulta única até ${filtros.dataFinal} para modalidade ${filtros.codigoModalidadeContratacao} (UF: ${filtros.uf || 'BR'})...`,
    );

    let pagina = 1;
    let totalPaginas = 1;
    let paginasComFalha = 0;
    const inicioConsulta = Date.now();

    while (pagina <= totalPaginas) {
      if (signal?.aborted) {
        const err: any = new Error('Ciclo abortado por timeout.');
        err.name = 'CicloAbortadoError';
        throw err;
      }
      const pageStart = Date.now();
      this.logger.log(
        `[PNCP] INÍCIO Busca página ${pagina}/${totalPaginas}...`,
      );

      try {
        const dataPayload = await this.enfileirarRequisicao<any>(
          `${this.baseUrl}/v1/contratacoes/proposta`,
          {
            ...filtros,
            dataInicial: filtros.dataInicial,
            dataFinal: filtros.dataFinal,
            pagina,
            tamanhoPagina: 50,
          },
        );

        const durationMs = Date.now() - pageStart;
        if (dataPayload) {
          const itens: PncpContratacaoRawDto[] = dataPayload.data || [];
          this.logger.log(
            `[PNCP] FIM Busca página ${pagina}/${totalPaginas} - Duração: ${durationMs}ms - Itens: ${itens.length}`,
          );
          resultados.push(...itens);
          totalPaginas = dataPayload.totalPaginas || 1;
        } else {
          if (pagina > 1) {
            this.logger.warn(
              `[PNCP] Página ${pagina} retornou vazia (nula) no meio da consulta. Tratando como falha.`,
            );
            paginasComFalha++;
          } else {
            this.logger.log(
              `[PNCP] FIM Busca página ${pagina}/${totalPaginas} (Vazia) - Duração: ${durationMs}ms`,
            );
            break;
          }
        }
      } catch (error: any) {
        paginasComFalha++;
        const durationMs = Date.now() - pageStart;
        this.logger.error(
          `[PNCP] Erro ao buscar página ${pagina}: ${error.message} - Duração: ${durationMs}ms`,
        );
        if (pagina === 1) {
          throw new Error(
            `Falha crítica na primeira página da consulta: ${error.message}`,
          );
        }
      }
      pagina++;
    }

    const duracaoTotal = Date.now() - inicioConsulta;
    this.logger.log(
      `[PNCP] FIM DA CONSULTA | Modalidade: ${filtros.codigoModalidadeContratacao} | Duração: ${duracaoTotal}ms | Total Encontrado: ${resultados.length} | Páginas Falhas: ${paginasComFalha}`,
    );

    const parcial = paginasComFalha > 0;
    if (parcial) {
      this.logger.warn(
        `[PNCP] Consulta PARCIAL: falha persistente em ${paginasComFalha} página(s).`,
      );
    }

    return { resultados, parcial, paginasComFalha };
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
      this.logger.error(
        `Erro ao buscar itens de ${numeroControlePNCP}: ${e.message}`,
      );
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
      const dataPayload = await this.enfileirarRequisicao<any>(
        url,
        undefined,
        true,
      );

      const itensDaPagina =
        dataPayload && dataPayload.data ? dataPayload.data : dataPayload || [];
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
    if (!ano) return [];

    const splitDash = cnpjESeq.split('-');
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
        const data = await this.enfileirarRequisicao<any>(url, undefined, true);

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
      const data = await this.enfileirarRequisicao<any>(url, undefined, true);
      return data;
    } catch (e) {
      this.logger.error(
        `Erro ao buscar contratacao ${cnpj}/${ano}/${sequencial}: ${e.message}`,
      );
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
