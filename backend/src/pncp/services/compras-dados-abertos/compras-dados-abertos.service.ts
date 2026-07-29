import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

      const url = `https://pncp.gov.br/api/consulta/v1/contratacoes?dataInicial=${formataData(dataInicial)}&dataFinal=${formataData(dataFinal)}&uf=${uf}&pagina=1`;

      this.logger.log(
        `Consultando contratos recentes na UF ${uf} via PNCP: ${url}`,
      );

      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 10000 }),
      );

      const contratacoes = response.data?.data || [];

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
