import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model, Connection } from 'mongoose';
import {
  Fornecedor,
  FornecedorDocument,
  ProdutoBase,
  ProdutoBaseDocument,
} from './fornecedor.schema';

@Injectable()
export class FornecedorService {
  constructor(
    @InjectModel(Fornecedor.name) private model: Model<FornecedorDocument>,
    @InjectModel(ProdutoBase.name)
    private intelModel: Model<ProdutoBaseDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  private validarCNPJ(cnpj: string): boolean {
    const limpo = cnpj.replace(/[^\d]+/g, '');
    if (limpo.length !== 14) return false;
    // simplificação para validação básica
    return true;
  }

  async create(data: any): Promise<Fornecedor> {
    if (!this.validarCNPJ(data.cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }
    const existe = await this.model.findOne({ cnpj: data.cnpj }).exec();
    if (existe)
      throw new BadRequestException('Fornecedor com este CNPJ já existe');

    return this.model.create({ ...data, origem: 'manual' });
  }

  async findAll(query: any): Promise<{
    data: Fornecedor[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const filters: any = {};
    if (query.categoria) filters.categorias = query.categoria;
    if (query.busca) {
      filters.$or = [
        { razaoSocial: { $regex: query.busca, $options: 'i' } },
        { cnpj: { $regex: query.busca, $options: 'i' } },
      ];
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.model.countDocuments(filters).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');
    return doc;
  }

  async update(id: string, data: any): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');

    if (data.telefone !== undefined) doc.telefone = data.telefone;
    if (data.nomeConsultor !== undefined)
      doc.nomeConsultor = data.nomeConsultor;
    if (data.email !== undefined) doc.email = data.email;
    if (data.cep !== undefined) doc.cep = data.cep;
    if (data.endereco !== undefined) doc.endereco = data.endereco;
    if (data.bairro !== undefined) doc.bairro = data.bairro;
    if (data.cidade !== undefined) doc.cidade = data.cidade;
    if (data.uf !== undefined) doc.uf = data.uf;
    if (data.site !== undefined) doc.site = data.site;
    if (data.portifolio !== undefined) doc.portifolio = data.portifolio;

    // Se origem for bot, só pode atualizar categorias, contato e campos não-fiscais
    if (doc.origem === 'bot') {
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    } else {
      if (data.razaoSocial) doc.razaoSocial = data.razaoSocial;
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    }

    return doc.save();
  }

  async remove(id: string): Promise<void> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');

    // Validate if the supplier is a "campeão" (winning) in any quotation
    const isCampea = await this.connection.collection('cotacaos').findOne({
      'itens.melhorPreco.fornecedorId': new mongoose.Types.ObjectId(id),
    });

    if (isCampea) {
      throw new BadRequestException(
        'Não é possível excluir este fornecedor pois ele é o campeão de preço em uma ou mais cotações. Desclassifique-o ou remova seu lance nas cotações vinculadas antes de excluí-lo.',
      );
    }

    // Delete the supplier
    await this.model.findByIdAndDelete(id).exec();

    // Cascading delete: remove all price references of this supplier from all Cotacoes
    await this.connection.collection('cotacaos').updateMany({}, {
      $pull: {
        'itens.$[].precosFornecedores': {
          fornecedorId: new mongoose.Types.ObjectId(id),
        },
      },
    } as any);
  }

  async registrarHistoricoPreco(
    fornecedorId: string,
    itemData: {
      descricaoItem: string;
      precoUnitario: number;
      precoEmbalagem?: number;
      fatorEmbalagem?: number;
      nomeEmbalagem?: string;
      observacao?: string;
      desclassificado?: boolean;
      oportunidadeId: string;
    },
  ): Promise<void> {
    await this.model.findByIdAndUpdate(fornecedorId, {
      $push: {
        fornecedor_historico_precos: {
          ...itemData,
          data: new Date(),
        },
      },
    });
  }

  async removerHistoricoPreco(
    fornecedorId: string,
    descricaoItem: string,
    oportunidadeId: string,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(fornecedorId, {
      $pull: {
        fornecedor_historico_precos: {
          descricaoItem: descricaoItem,
          oportunidadeId: oportunidadeId,
        },
      },
    });
  }

  async getBaseProdutos(query: any = {}): Promise<any> {
    const fornecedores = await this.model
      .find({ 'fornecedor_historico_precos.0': { $exists: true } })
      .exec();
    const produtosMap = new Map<string, any>();

    const busca = query.busca ? query.busca.toLowerCase() : '';

    for (const f of fornecedores) {
      for (const hist of f.fornecedor_historico_precos) {
        const pNome = hist.descricaoItem;

        if (busca && !pNome.toLowerCase().includes(busca)) {
          continue;
        }

        if (!produtosMap.has(pNome)) {
          produtosMap.set(pNome, {
            descricaoItem: pNome,
            cotacoes: [],
          });
        }

        const prod = produtosMap.get(pNome);

        const existingCotacaoIdx = prod.cotacoes.findIndex(
          (c: any) => c.fornecedorId.toString() === f._id.toString(),
        );

        if (existingCotacaoIdx >= 0) {
          if (
            new Date(hist.data) >
            new Date(prod.cotacoes[existingCotacaoIdx].data)
          ) {
            prod.cotacoes[existingCotacaoIdx] = {
              fornecedorId: f._id,
              razaoSocial: f.razaoSocial,
              precoUnitario: hist.precoUnitario,
              precoEmbalagem: hist.precoEmbalagem,
              fatorEmbalagem: hist.fatorEmbalagem,
              nomeEmbalagem: hist.nomeEmbalagem,
              observacao: hist.observacao,
              desclassificado: hist.desclassificado,
              site: f.site,
              portifolio: f.portifolio,
              data: hist.data,
              oportunidadeId: hist.oportunidadeId,
            };
          }
        } else {
          prod.cotacoes.push({
            fornecedorId: f._id,
            razaoSocial: f.razaoSocial,
            precoUnitario: hist.precoUnitario,
            precoEmbalagem: hist.precoEmbalagem,
            fatorEmbalagem: hist.fatorEmbalagem,
            nomeEmbalagem: hist.nomeEmbalagem,
            observacao: hist.observacao,
            desclassificado: hist.desclassificado,
            site: f.site,
            portifolio: f.portifolio,
            data: hist.data,
            oportunidadeId: hist.oportunidadeId,
          });
        }
      }
    }

    let baseProdutos = Array.from(produtosMap.values()).map((prod) => {
      let campea = null;
      for (const c of prod.cotacoes) {
        if (c.desclassificado) continue;
        if (!campea || c.precoUnitario < campea.precoUnitario) {
          campea = c;
        }
      }
      return {
        ...prod,
        campea,
      };
    });

    // Pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const total = baseProdutos.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    baseProdutos = baseProdutos.slice(skip, skip + limit);

    // Fetch inteligência (nossoLance, valorCampeao) for this page
    const descricoes = baseProdutos.map((p) => p.descricaoItem);
    const intelDocs = await this.intelModel
      .find({ descricaoItem: { $in: descricoes } })
      .exec();

    const intelMap = new Map(intelDocs.map((doc) => [doc.descricaoItem, doc]));

    baseProdutos = baseProdutos.map((prod) => {
      const intel = intelMap.get(prod.descricaoItem);
      return {
        ...prod,
        nossoLanceOficial: intel?.nossoLanceOficial || null,
        valorCampeaoLicitacao: intel?.valorCampeaoLicitacao || null,
      };
    });

    return {
      data: baseProdutos,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async updateProdutoBase(
    descricaoItem: string,
    data: { nossoLanceOficial?: number; valorCampeaoLicitacao?: number },
  ): Promise<ProdutoBase> {
    const existe = await this.intelModel.findOne({ descricaoItem }).exec();
    if (existe) {
      if (data.nossoLanceOficial !== undefined)
        existe.nossoLanceOficial = data.nossoLanceOficial;
      if (data.valorCampeaoLicitacao !== undefined)
        existe.valorCampeaoLicitacao = data.valorCampeaoLicitacao;
      return existe.save();
    } else {
      return this.intelModel.create({
        descricaoItem,
        nossoLanceOficial: data.nossoLanceOficial,
        valorCampeaoLicitacao: data.valorCampeaoLicitacao,
      });
    }
  }
}
