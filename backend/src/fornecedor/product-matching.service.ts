import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProdutoCnaeMap,
  ProdutoCnaeMapDocument,
} from './produto-cnae-map.schema';

@Injectable()
export class ProductMatchingService {
  private readonly logger = new Logger(ProductMatchingService.name);

  constructor(
    @InjectModel(ProdutoCnaeMap.name)
    private produtoCnaeMapModel: Model<ProdutoCnaeMapDocument>,
  ) {}

  /**
   * Checa se a empresa vende o produto usando 3 camadas:
   * 1) Match de CNAE exato via dicionário.
   * 2) Match de palavra-chave mapeada (sinônimos) na Razão Social ou Descrição do CNAE.
   * 3) Match literal (antigo) da query na Razão Social ou Descrição do CNAE se o dicionário falhar.
   */
  async doesCompanySellProduct(
    query: string,
    empresa: {
      razao_social?: string;
      cnae_descricao?: string;
      cnae_principal?: string;
    },
  ): Promise<boolean> {
    const queryUpper = query.toUpperCase();
    const map = await this.produtoCnaeMapModel
      .findOne({ produto: queryUpper })
      .exec();

    // Texto alvo para busca textual (2 e 3)
    const textTarget =
      `${empresa.razao_social || ''} ${empresa.cnae_descricao || ''}`.toUpperCase();

    if (map) {
      // 1) Match CNAE Exato (normalizando para apenas números)
      if (empresa.cnae_principal) {
        const cnaesNormalizados = map.cnaes.map((c) => c.replace(/\D/g, ''));
        const empresaCnaeNormalizado = empresa.cnae_principal.replace(
          /\D/g,
          '',
        );

        if (cnaesNormalizados.includes(empresaCnaeNormalizado)) {
          return true;
        }
      }

      // 2) Match Sinônimos no Texto
      const termos = [map.produto, ...map.sinonimos];
      for (const termo of termos) {
        if (textTarget.includes(termo.toUpperCase())) {
          return true;
        }
      }
      return false; // Se está mapeado e não bateu, é porque não vende.
    }

    // 3) Match literal (Fallback Antigo)
    // Se não achou mapeamento, avisa no log para cadastrarmos.
    this.logger.warn(
      `Produto sem mapeamento de CNAE: ${queryUpper}. Fazendo match literal.`,
    );
    return textTarget.includes(queryUpper);
  }
}
