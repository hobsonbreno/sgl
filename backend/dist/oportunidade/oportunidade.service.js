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
var OportunidadeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OportunidadeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const oportunidade_schema_1 = require("./oportunidade.schema");
const pncp_client_service_1 = require("../pncp/services/pncp-client/pncp-client.service");
const produto_schema_1 = require("../produto/produto.schema");
let OportunidadeService = OportunidadeService_1 = class OportunidadeService {
    model;
    pncpClientService;
    produtoModel;
    logger = new common_1.Logger(OportunidadeService_1.name);
    constructor(model, pncpClientService, produtoModel) {
        this.model = model;
        this.pncpClientService = pncpClientService;
        this.produtoModel = produtoModel;
    }
    async findAll(query) {
        const filters = {};
        if (query.kanbanStatus)
            filters.kanbanStatus = query.kanbanStatus;
        if (query.uf)
            filters.uf = query.uf;
        if (query.modalidadeCodigo)
            filters.modalidadeCodigo = query.modalidadeCodigo;
        if (query.prazoAteEmDias) {
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + Number(query.prazoAteEmDias));
            filters.dataEncerramentoProposta = { $lte: hoje, $gte: new Date() };
        }
        const agora = new Date();
        filters.$or = [
            { kanbanStatus: { $ne: 'EXCLUIDA' } },
            { kanbanStatus: 'EXCLUIDA', dataEncerramentoProposta: { $gte: agora } },
            { kanbanStatus: 'EXCLUIDA', dataEncerramentoProposta: null },
            {
                kanbanStatus: 'EXCLUIDA',
                dataEncerramentoProposta: { $exists: false },
            },
        ];
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
    async findOne(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        return doc;
    }
    async updateStatus(id, kanbanStatus) {
        if (!kanbanStatus) {
            throw new common_1.BadRequestException('Status não informado');
        }
        const doc = await this.model
            .findByIdAndUpdate(id, { kanbanStatus, dataMudancaStatus: new Date() }, { new: true })
            .exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        if (kanbanStatus === 'EXCLUIDA') {
            await this.produtoModel.deleteMany({ oportunidadeId: id }).exec();
            this.logger.log(`Produtos da oportunidade ${id} removidos (movida para lixeira)`);
        }
        return doc;
    }
    async sincronizarItens(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        if (!doc.numeroControlePNCP) {
            throw new common_1.BadRequestException('Oportunidade sem número de controle PNCP');
        }
        const produtosExistentes = await this.produtoModel
            .countDocuments({ oportunidadeId: id })
            .exec();
        try {
            const itensRaw = await this.pncpClientService.buscarItensDaContratacao(doc.numeroControlePNCP);
            if (!itensRaw || itensRaw.length === 0) {
                return { message: 'Nenhum item retornado pela API da PNCP', total: 0 };
            }
            const novosProdutos = itensRaw.map((item) => ({
                oportunidadeId: id,
                numeroItem: item.numeroItem || 0,
                descricao: item.descricao || 'Item sem descrição',
                quantidade: item.quantidade || 1,
                unidadeMedida: item.unidadeMedida || 'UN',
                valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
                valorTotalEstimado: item.valorTotal || 0,
                valorEstimado: item.valorTotal || 0,
            }));
            const ops = novosProdutos.map((prod) => ({
                updateOne: {
                    filter: { oportunidadeId: id, numeroItem: prod.numeroItem },
                    update: { $set: prod },
                    upsert: true,
                },
            }));
            await this.produtoModel.bulkWrite(ops);
            this.logger.log(`Sincronizados (upsert) ${novosProdutos.length} itens para a oportunidade ${id}`);
            return {
                message: 'Itens sincronizados com sucesso',
                total: novosProdutos.length,
            };
        }
        catch (e) {
            this.logger.error(`Erro ao sincronizar itens da oportunidade ${id}: ${e.message}`);
            throw new common_1.BadRequestException('Não foi possível carregar os itens agora, tente novamente.');
        }
    }
    async remove(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        try {
            await this.model.updateOne({ _id: doc._id }, { $set: { kanbanStatus: 'EXCLUIDA', dataMudancaStatus: new Date() } });
            await this.produtoModel.deleteMany({ oportunidadeId: id }).exec();
            this.logger.log(`Oportunidade ${id} enviada para lixeira e produtos removidos`);
            return { message: 'Oportunidade excluída com sucesso' };
        }
        catch (error) {
            this.logger.error(`Erro ao excluir oportunidade ${id}: ${error.message}`);
            throw new common_1.BadRequestException('Erro ao excluir oportunidade');
        }
    }
};
exports.OportunidadeService = OportunidadeService;
exports.OportunidadeService = OportunidadeService = OportunidadeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __param(2, (0, mongoose_1.InjectModel)(produto_schema_1.Produto.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        pncp_client_service_1.PncpClientService,
        mongoose_2.Model])
], OportunidadeService);
//# sourceMappingURL=oportunidade.service.js.map