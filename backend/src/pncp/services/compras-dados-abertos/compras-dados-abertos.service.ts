import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { retryWithBackoff } from '../../../receita-federal/utils/retry-with-backoff';

@Injectable()
export class ComprasDadosAbertosService {
  private readonly logger = new Logger(ComprasDadosAbertosService.name);
  private readonly baseUrl = 'https://dadosabertos.compras.gov.br';

  constructor(private readonly httpService: HttpService) {}

  async pesquisarHistoricoPrecos(keyword: string, uf: string): Promise<any> {
    this.logger.log(
      `Iniciando pesquisa de inteligência competitiva para: ${keyword} em ${uf}`,
    );

    try {
      const dataFinal = new Date();
      const dataInicial = new Date();
      dataInicial.setMonth(dataInicial.getMonth() - 6); // Últimos 6 meses

      const formataData = (d: Date) => {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      };

      let contratacoes: any[] = [];
      const modalidades = [6, 8]; // 6: Pregão Eletrônico, 8: Dispensa de Licitação

      for (const modalidade of modalidades) {
        // Busca as últimas 4 páginas (200 contratações recentes) por modalidade
        for (let pagina = 1; pagina <= 4; pagina++) {
          const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${formataData(dataInicial)}&dataFinal=${formataData(dataFinal)}&uf=${uf}&codigoModalidadeContratacao=${modalidade}&pagina=${pagina}`;
          this.logger.log(`Consultando histórico na UF ${uf} (Modalidade ${modalidade}, pág ${pagina}) via PNCP...`);

          try {
            const response = await retryWithBackoff(
              () => this.httpService.axiosRef.get(url, { timeout: 15000 }),
              {
                maxRetries: 3,
                baseDelayMs: 2000,
                onRetry: (attempt, err) =>
                  this.logger.warn(`Modalidade ${modalidade} Pág ${pagina}: tentativa ${attempt} falhou (${err.message}), retentando...`),
              },
            );
            if (response.data?.data) {
              contratacoes = contratacoes.concat(response.data.data);
            }
          } catch (err: any) {
            if (err.response?.status === 404 || err.response?.status === 422) {
              break; // Se deu 404 na pagina, não tem mais páginas
            }
            this.logger.warn(`Erro na modalidade ${modalidade}, Pág ${pagina}: ${err.message}`);
          }
        }
      }

      // Filtrar contratos que contêm a palavra chave no objeto
      const contratosValidos = contratacoes.filter(
        (c: any) =>
          c.objetoCompra &&
          c.objetoCompra.toLowerCase().includes(keyword.toLowerCase()),
      );

      let precoMinimo = 999999;
      let precoMaximo = 0;
      let somaPrecos = 0;
      let countPrecos = 0;
      const vencedores = new Map<string, number>(); // Nome -> Quantidade de vitórias

      for (const contrato of contratosValidos) {
        const valor = contrato.valorTotalEstimado || 0;
        if (valor > 0) {
          if (valor < precoMinimo) precoMinimo = valor;
          if (valor > precoMaximo) precoMaximo = valor;
          somaPrecos += valor;
          countPrecos++;
        }
        const fornecedor =
          contrato.nomeFornecedor ||
          contrato.orgaoEntidade?.razaoSocial ||
          'Fornecedor Sigiloso';
        vencedores.set(fornecedor, (vencedores.get(fornecedor) || 0) + 1);
      }

      if (countPrecos === 0) {
        this.logger.log(
          `Nenhum contrato exato encontrado para ${keyword} em ${uf}.`,
        );

        return {
          sucesso: true,
          semDados: true,
          precoMinimo: null,
          precoMaximo: null,
          precoMedio: null,
          topVencedores: [],
        };
      }

      const precoMedio = somaPrecos / countPrecos;

      // Ordenar os maiores vencedores
      const topVencedores = Array.from(vencedores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => ({ nome: entry[0], vitorias: entry[1] }));

      this.logger.log(
        `Inteligência gerada para ${keyword}: Média R$ ${precoMedio.toFixed(2)}`,
      );

      return {
        sucesso: true,
        precoMinimo,
        precoMaximo,
        precoMedio,
        topVencedores,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao consultar API do PNCP para Inteligência: ${error.message}`,
      );
      throw new HttpException(
        `Erro de comunicação com a API do PNCP: ${error.message}`,
        502,
      );
    }
  }
}
