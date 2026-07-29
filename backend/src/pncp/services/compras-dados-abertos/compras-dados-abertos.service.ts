import { Injectable, Logger, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Oportunidade } from '../../../oportunidade/oportunidade.schema';

@Injectable()
export class ComprasDadosAbertosService {
  private readonly logger = new Logger(ComprasDadosAbertosService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<Oportunidade>
  ) {}

  async pesquisarHistoricoPrecos(keyword: string, uf: string): Promise<any> {
    this.logger.log(
      `Iniciando pesquisa de inteligência competitiva no Data Lake para: ${keyword} em ${uf}`,
    );

    try {
      // Busca oportunidades no banco local (Data Lake) que possuem itens com a palavra-chave
      const regex = new RegExp(keyword, 'i');
      const oportunidades = await this.oportunidadeModel.find({
        uf: uf,
        'itens.descricao': { $regex: regex }
      }).limit(300).lean();

      let precoMinimo = 999999;
      let precoMaximo = 0;
      let somaPrecos = 0;
      let countPrecos = 0;
      const vencedores = new Map<string, number>(); // Nome -> Quantidade de vitórias

      for (const opt of oportunidades) {
        // Encontra os itens específicos dentro da oportunidade
        const itensValidos = (opt.itens || []).filter((i: any) => 
          (i.descricao && regex.test(i.descricao)) || 
          (i.descricaoItem && regex.test(i.descricaoItem))
        );

        for (const item of itensValidos) {
          const valor = item.valorUnitarioEstimado || 0;
          if (valor > 0) {
            if (valor < precoMinimo) precoMinimo = valor;
            if (valor > precoMaximo) precoMaximo = valor;
            somaPrecos += valor;
            countPrecos++;
          }
        }

        // Tenta extrair o nome do órgão como "vencedor" (ou fornecedor se houver no futuro)
        if (itensValidos.length > 0) {
          const fornecedor = (opt as any).orgaoEntidade?.razaoSocial || 'Órgão Licitante (Aberto)';
          vencedores.set(fornecedor, (vencedores.get(fornecedor) || 0) + 1);
        }
      }

      if (countPrecos === 0) {
        this.logger.log(
          `Nenhum item com valor unitário encontrado para ${keyword} em ${uf}. Buscando média nacional como fallback...`,
        );

        // Fallback: Tenta sem filtrar por UF
        const oportunidadesNacionais = await this.oportunidadeModel.find({
          'itens.descricao': { $regex: regex }
        }).limit(300).lean();

        for (const opt of oportunidadesNacionais) {
          const itensValidos = (opt.itens || []).filter((i: any) => 
            (i.descricao && regex.test(i.descricao)) || 
            (i.descricaoItem && regex.test(i.descricaoItem))
          );
          for (const item of itensValidos) {
            const valor = item.valorUnitarioEstimado || 0;
            if (valor > 0) {
              if (valor < precoMinimo) precoMinimo = valor;
              if (valor > precoMaximo) precoMaximo = valor;
              somaPrecos += valor;
              countPrecos++;
            }
          }
          if (itensValidos.length > 0) {
            const fornecedor = (opt as any).orgaoEntidade?.razaoSocial || 'Órgão Licitante (Aberto)';
            vencedores.set(fornecedor, (vencedores.get(fornecedor) || 0) + 1);
          }
        }

        if (countPrecos === 0) {
           return {
             sucesso: true,
             semDados: true,
             precoMinimo: null,
             precoMaximo: null,
             precoMedio: null,
             topVencedores: [],
           };
        }
      }

      const precoMedio = somaPrecos / countPrecos;

      // Ordenar os maiores "vencedores" (ou órgãos que mais compram isso)
      const topVencedores = Array.from(vencedores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => ({ nome: entry[0], vitorias: entry[1] }));

      this.logger.log(
        `Inteligência gerada para ${keyword}: Média R$ ${precoMedio.toFixed(2)} (baseada em ${countPrecos} itens)`,
      );

      return {
        sucesso: true,
        precoMinimo,
        precoMaximo,
        precoMedio,
        topVencedores,
      };
    } catch (error: any) {
      this.logger.error(
        `Erro ao consultar Data Lake para Inteligência: ${error.message}`,
      );
      throw new HttpException(
        `Erro interno de banco de dados: ${error.message}`,
        500,
      );
    }
  }
}
