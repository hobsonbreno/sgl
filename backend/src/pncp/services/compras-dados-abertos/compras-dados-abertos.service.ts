import { Injectable, Logger, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Oportunidade } from '../../../oportunidade/oportunidade.schema';
import { Produto } from '../../../produto/produto.schema';

@Injectable()
export class ComprasDadosAbertosService {
  private readonly logger = new Logger(ComprasDadosAbertosService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<Oportunidade>,
    @InjectModel(Produto.name) private produtoModel: Model<Produto>
  ) {}

  async pesquisarHistoricoPrecos(keyword: string, uf: string): Promise<any> {
    this.logger.log(
      `Iniciando pesquisa de inteligência competitiva no Data Lake para: ${keyword} em ${uf}`,
    );

    try {
      const regex = new RegExp(keyword, 'i');
      
      // 1. Encontra todos os PRODUTOS que batem com a keyword no Data Lake
      const produtosAchados = await this.produtoModel.find({
        descricao: { $regex: regex }
      }).limit(1000).lean();

      if (!produtosAchados.length) {
        return { sucesso: true, semDados: true, precoMinimo: null, precoMaximo: null, precoMedio: null, topVencedores: [] };
      }

      // 2. Extrai os IDs únicos das Oportunidades
      const oppIds = [...new Set(produtosAchados.map(p => p.oportunidadeId))];

      // 3. Busca as Oportunidades correspondentes
      const oportunidadesDb = await this.oportunidadeModel.find({
        _id: { $in: oppIds }
      }).lean();

      // Mapeia Oportunidade por ID
      const oppMap = new Map();
      for (const op of oportunidadesDb) {
        oppMap.set(op._id.toString(), op);
      }

      let precoMinimo = 999999;
      let precoMaximo = 0;
      let somaPrecos = 0;
      let countPrecos = 0;
      const vencedores = new Map<string, number>();

      let processar = (filtroUF: string | null) => {
        for (const prod of produtosAchados) {
          const op = oppMap.get(prod.oportunidadeId);
          if (!op) continue;
          if (filtroUF && op.uf !== filtroUF) continue;

          const valor = prod.valorUnitarioEstimado || 0;
          if (valor > 0) {
            if (valor < precoMinimo) precoMinimo = valor;
            if (valor > precoMaximo) precoMaximo = valor;
            somaPrecos += valor;
            countPrecos++;

            const fornecedor = op.orgaoNome || 'Órgão Licitante (Aberto)';
            vencedores.set(fornecedor, (vencedores.get(fornecedor) || 0) + 1);
          }
        }
      };

      // Tenta filtrar pela UF especificada
      processar(uf);

      // Fallback Nacional
      if (countPrecos === 0) {
        this.logger.log(`Nenhum item com valor unitário encontrado para ${keyword} em ${uf}. Buscando média nacional como fallback...`);
        processar(null); // Passa null para UF, aceitando qualquer estado

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
