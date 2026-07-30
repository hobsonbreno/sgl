import { Injectable, Logger, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultadoItem, ResultadoItemDocument } from '../../schemas/resultado-item.schema';
import { Oportunidade, OportunidadeDocument } from '../../../oportunidade/oportunidade.schema';

@Injectable()
export class ComprasDadosAbertosService {
  private readonly logger = new Logger(ComprasDadosAbertosService.name);

  constructor(
    @InjectModel(ResultadoItem.name)
    private readonly resultadoItemModel: Model<ResultadoItemDocument>,
    @InjectModel(Oportunidade.name)
    private readonly oportunidadeModel: Model<OportunidadeDocument>,
  ) {}

  async pesquisarHistoricoPrecos(keyword: string, uf: string): Promise<any> {
    this.logger.log(
      `Iniciando pesquisa de inteligência competitiva no Data Lake para: ${keyword} em ${uf}`,
    );

    try {
      if (
        !keyword ||
        keyword.trim() === '' ||
        keyword.toLowerCase() === 'produto'
      ) {
        return this.respostaSemDados();
      }

      // Em vez de regex que varre tudo, buscamos a palavra exata usando o regex de âncora
      // ou usamos o match direto na palavraChaveExtraida no futuro. 
      // O regex de inicio garante que começamos pelo produto correto:
      const regex = new RegExp('^' + keyword, 'i');
      const produtosAchados = await this.resultadoItemModel.find({
        palavraChaveExtraida: { $regex: regex }
      }).limit(1000).lean();

      if (produtosAchados.length === 0) {
        return this.respostaSemDados();
      }

      let precosBrutos: number[] = [];
      const vencedores = new Map<string, number>();

      let processar = (filtroUF: string | null) => {
        precosBrutos = [];
        vencedores.clear();

        for (const prod of produtosAchados) {
          if (filtroUF && prod.uf !== filtroUF) continue;

          const valor = prod.valorUnitarioHomologado || 0;
          if (valor > 0) {
            precosBrutos.push(valor);
            const fornecedor = prod.nomeRazaoSocialFornecedor || 'Fornecedor Desconhecido';
            vencedores.set(fornecedor, (vencedores.get(fornecedor) || 0) + 1);
          }
        }
      };

      // Tenta filtrar pela UF especificada
      processar(uf);

      // Fallback Nacional
      if (precosBrutos.length === 0) {
        this.logger.log(
          `Nenhum item com valor unitário encontrado para ${keyword} em ${uf}. Buscando média nacional como fallback...`,
        );
        processar(null); // Passa null para UF, aceitando qualquer estado

        if (precosBrutos.length === 0) {
          return this.respostaSemDados();
        }
      }

      // 4. Remover Outliers usando a Mediana
      precosBrutos.sort((a, b) => a - b);
      const mid = Math.floor(precosBrutos.length / 2);
      const median =
        precosBrutos.length % 2 === 0
          ? (precosBrutos[mid - 1] + precosBrutos[mid]) / 2
          : precosBrutos[mid];

      // Remove valores absurdamente altos (ex: compras por "Lote" de 5000 unidades) ou baixos
      const precosFiltrados = precosBrutos.filter(
        (p) => p >= median * 0.2 && p <= median * 5,
      );
      const precosFinais =
        precosFiltrados.length > 0 ? precosFiltrados : precosBrutos;

      const precoMinimo = Math.min(...precosFinais);
      const precoMaximo = Math.max(...precosFinais);
      const somaPrecos = precosFinais.reduce((a, b) => a + b, 0);
      const precoMedio = somaPrecos / precosFinais.length;

      // Ordenar os maiores "vencedores" (ou órgãos que mais compram isso)
      const topVencedores = Array.from(vencedores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => ({ nome: entry[0], vitorias: entry[1] }));

      this.logger.log(
        `Inteligência gerada para ${keyword}: Média R$ ${precoMedio.toFixed(2)} (baseada em ${precosFinais.length} itens)`,
      );

      return {
        sucesso: true,
        baixaConfianca: precosFinais.length < 5,
        amostraEncontrada: precosFinais.length,
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

  private respostaSemDados() {
    return {
      sucesso: true,
      semDados: true,
      baixaConfianca: true,
      amostraEncontrada: 0,
      precoMinimo: null,
      precoMaximo: null,
      precoMedio: null,
      topVencedores: [],
    };
  }
}
