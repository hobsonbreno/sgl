import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposta, PropostaDocument } from './proposta.schema';
import { Cotacao, CotacaoDocument } from '../cotacao/cotacao.schema';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';

@Injectable()
export class PropostaService {
  constructor(
    @InjectModel(Proposta.name) private propostaModel: Model<PropostaDocument>,
    @InjectModel(Cotacao.name) private cotacaoModel: Model<CotacaoDocument>,
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<OportunidadeDocument>
  ) {}

  async criarProposta(oportunidadeId: string, payload: any) {
    const cotacao = await this.cotacaoModel.findOne({ oportunidadeId }).exec();
    
    if (!cotacao || !cotacao.valorTotalMelhorCotacao || cotacao.valorTotalMelhorCotacao <= 0) {
      throw new BadRequestException('Finalize a cotação antes de lançar a proposta');
    }

    const novaProposta = new this.propostaModel({
      oportunidadeId,
      cotacaoId: cotacao._id,
      valorTotalCotado: cotacao.valorTotalMelhorCotacao,
      margemAplicada: payload.margemAplicada,
      valorLancado: payload.valorLancado,
      status: 'AGUARDANDO_RESPOSTA',
      dataLancamento: new Date(),
      dataAtualizacaoStatus: new Date(),
      observacoes: payload.observacoes
    });

    const propostaSalva = await novaProposta.save();

    await this.oportunidadeModel.findByIdAndUpdate(oportunidadeId, {
      kanbanStatus: 'AGUARDANDO_RESPOSTA'
    }).exec();

    return propostaSalva;
  }

  async atualizarStatus(id: string, status: string) {
    const permitidos = ['AGUARDANDO_RESPOSTA', 'VENCEDOR', 'PERDEU', 'CANCELADO'];
    if (!permitidos.includes(status)) {
      throw new BadRequestException('Status inválido');
    }

    const proposta = await this.propostaModel.findByIdAndUpdate(
      id,
      { status, dataAtualizacaoStatus: new Date() },
      { new: true }
    ).exec();

    if (!proposta) throw new NotFoundException('Proposta não encontrada');
    return proposta;
  }

  async listar(query: any) {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.dataDe || query.dataAte) {
      filter.dataLancamento = {};
      if (query.dataDe) filter.dataLancamento.$gte = new Date(query.dataDe);
      if (query.dataAte) filter.dataLancamento.$lte = new Date(query.dataAte);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.propostaModel
      .find(filter)
      .populate('oportunidadeId', 'orgaoNome objetoCompra numeroControlePNCP uf')
      .sort({ dataLancamento: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.propostaModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async buscarPorId(id: string) {
    const proposta = await this.propostaModel.findById(id).populate('oportunidadeId').exec();
    if (!proposta) throw new NotFoundException('Proposta não encontrada');
    return proposta;
  }
}
