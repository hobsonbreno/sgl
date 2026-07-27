"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropostaService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const proposta_schema_1 = require("./proposta.schema");
const cotacao_schema_1 = require("../cotacao/cotacao.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
let PropostaService = class PropostaService {
    propostaModel;
    cotacaoModel;
    oportunidadeModel;
    constructor(propostaModel, cotacaoModel, oportunidadeModel) {
        this.propostaModel = propostaModel;
        this.cotacaoModel = cotacaoModel;
        this.oportunidadeModel = oportunidadeModel;
    }
    async criarProposta(oportunidadeId, payload) {
        const cotacao = await this.cotacaoModel.findOne({ oportunidadeId }).exec();
        if (!cotacao ||
            !cotacao.valorTotalMelhorCotacao ||
            cotacao.valorTotalMelhorCotacao <= 0) {
            throw new common_1.BadRequestException('Finalize a cotação antes de lançar a proposta');
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
            observacoes: payload.observacoes,
        });
        const propostaSalva = await novaProposta.save();
        await this.oportunidadeModel
            .findByIdAndUpdate(oportunidadeId, {
            kanbanStatus: 'AGUARDANDO_RESPOSTA',
        })
            .exec();
        return propostaSalva;
    }
    async atualizarStatus(id, status) {
        const permitidos = [
            'AGUARDANDO_RESPOSTA',
            'VENCEDOR',
            'PERDEU',
            'CANCELADO',
        ];
        if (!permitidos.includes(status)) {
            throw new common_1.BadRequestException('Status inválido');
        }
        const proposta = await this.propostaModel
            .findByIdAndUpdate(id, { status, dataAtualizacaoStatus: new Date() }, { new: true })
            .exec();
        if (!proposta)
            throw new common_1.NotFoundException('Proposta não encontrada');
        return proposta;
    }
    async listar(query) {
        const filter = {};
        if (query.status) {
            filter.status = query.status;
        }
        if (query.dataDe || query.dataAte) {
            filter.dataLancamento = {};
            if (query.dataDe)
                filter.dataLancamento.$gte = new Date(query.dataDe);
            if (query.dataAte)
                filter.dataLancamento.$lte = new Date(query.dataAte);
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
    async buscarPorId(id) {
        const proposta = await this.propostaModel
            .findById(id)
            .populate('oportunidadeId')
            .exec();
        if (!proposta)
            throw new common_1.NotFoundException('Proposta não encontrada');
        return proposta;
    }
};
exports.PropostaService = PropostaService;
exports.PropostaService = PropostaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(proposta_schema_1.Proposta.name)),
    __param(1, (0, mongoose_1.InjectModel)(cotacao_schema_1.Cotacao.name)),
    __param(2, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PropostaService);
//# sourceMappingURL=proposta.service.js.map