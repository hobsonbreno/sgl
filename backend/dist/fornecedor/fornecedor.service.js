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
exports.FornecedorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const fornecedor_schema_1 = require("./fornecedor.schema");
let FornecedorService = class FornecedorService {
    model;
    intelModel;
    constructor(model, intelModel) {
        this.model = model;
        this.intelModel = intelModel;
    }
    validarCNPJ(cnpj) {
        const limpo = cnpj.replace(/[^\d]+/g, '');
        if (limpo.length !== 14)
            return false;
        return true;
    }
    async create(data) {
        if (!this.validarCNPJ(data.cnpj)) {
            throw new common_1.BadRequestException('CNPJ inválido');
        }
        const existe = await this.model.findOne({ cnpj: data.cnpj }).exec();
        if (existe)
            throw new common_1.BadRequestException('Fornecedor com este CNPJ já existe');
        return this.model.create({ ...data, origem: 'manual' });
    }
    async findAll(query) {
        const filters = {};
        if (query.categoria)
            filters.categorias = query.categoria;
        if (query.busca) {
            filters.$or = [
                { razaoSocial: { $regex: query.busca, $options: 'i' } },
                { cnpj: { $regex: query.busca, $options: 'i' } }
            ];
        }
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        const data = await this.model.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
        const total = await this.model.countDocuments(filters).exec();
        const totalPages = Math.ceil(total / limit) || 1;
        return { data, total, totalPages, currentPage: page };
    }
    async findOne(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Fornecedor não encontrado');
        return doc;
    }
    async update(id, data) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Fornecedor não encontrado');
        if (data.telefone !== undefined)
            doc.telefone = data.telefone;
        if (data.nomeConsultor !== undefined)
            doc.nomeConsultor = data.nomeConsultor;
        if (data.email !== undefined)
            doc.email = data.email;
        if (data.cep !== undefined)
            doc.cep = data.cep;
        if (data.endereco !== undefined)
            doc.endereco = data.endereco;
        if (data.bairro !== undefined)
            doc.bairro = data.bairro;
        if (data.cidade !== undefined)
            doc.cidade = data.cidade;
        if (data.uf !== undefined)
            doc.uf = data.uf;
        if (data.site !== undefined)
            doc.site = data.site;
        if (data.portifolio !== undefined)
            doc.portifolio = data.portifolio;
        if (doc.origem === 'bot') {
            if (data.categorias)
                doc.categorias = data.categorias;
            if (data.contato)
                doc.contato = data.contato;
        }
        else {
            if (data.razaoSocial)
                doc.razaoSocial = data.razaoSocial;
            if (data.categorias)
                doc.categorias = data.categorias;
            if (data.contato)
                doc.contato = data.contato;
        }
        return doc.save();
    }
    async registrarHistoricoPreco(fornecedorId, itemData) {
        await this.model.findByIdAndUpdate(fornecedorId, {
            $push: {
                fornecedor_historico_precos: {
                    ...itemData,
                    data: new Date()
                }
            }
        });
    }
    async getBaseProdutos(query = {}) {
        const fornecedores = await this.model.find({ 'fornecedor_historico_precos.0': { $exists: true } }).exec();
        const produtosMap = new Map();
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
                        cotacoes: []
                    });
                }
                const prod = produtosMap.get(pNome);
                const existingCotacaoIdx = prod.cotacoes.findIndex((c) => c.fornecedorId.toString() === f._id.toString());
                if (existingCotacaoIdx >= 0) {
                    if (new Date(hist.data) > new Date(prod.cotacoes[existingCotacaoIdx].data)) {
                        prod.cotacoes[existingCotacaoIdx] = {
                            fornecedorId: f._id,
                            razaoSocial: f.razaoSocial,
                            precoUnitario: hist.precoUnitario,
                            precoEmbalagem: hist.precoEmbalagem,
                            fatorEmbalagem: hist.fatorEmbalagem,
                            data: hist.data,
                            oportunidadeId: hist.oportunidadeId
                        };
                    }
                }
                else {
                    prod.cotacoes.push({
                        fornecedorId: f._id,
                        razaoSocial: f.razaoSocial,
                        precoUnitario: hist.precoUnitario,
                        precoEmbalagem: hist.precoEmbalagem,
                        fatorEmbalagem: hist.fatorEmbalagem,
                        data: hist.data,
                        oportunidadeId: hist.oportunidadeId
                    });
                }
            }
        }
        let baseProdutos = Array.from(produtosMap.values()).map(prod => {
            let campea = null;
            for (const c of prod.cotacoes) {
                if (!campea || c.precoUnitario < campea.precoUnitario) {
                    campea = c;
                }
            }
            return {
                ...prod,
                campea
            };
        });
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const total = baseProdutos.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const skip = (page - 1) * limit;
        baseProdutos = baseProdutos.slice(skip, skip + limit);
        const descricoes = baseProdutos.map(p => p.descricaoItem);
        const intelDocs = await this.intelModel.find({ descricaoItem: { $in: descricoes } }).exec();
        const intelMap = new Map(intelDocs.map(doc => [doc.descricaoItem, doc]));
        baseProdutos = baseProdutos.map(prod => {
            const intel = intelMap.get(prod.descricaoItem);
            return {
                ...prod,
                nossoLanceOficial: intel?.nossoLanceOficial || null,
                valorCampeaoLicitacao: intel?.valorCampeaoLicitacao || null
            };
        });
        return {
            data: baseProdutos,
            total,
            totalPages,
            currentPage: page
        };
    }
    async updateProdutoBase(descricaoItem, data) {
        const existe = await this.intelModel.findOne({ descricaoItem }).exec();
        if (existe) {
            if (data.nossoLanceOficial !== undefined)
                existe.nossoLanceOficial = data.nossoLanceOficial;
            if (data.valorCampeaoLicitacao !== undefined)
                existe.valorCampeaoLicitacao = data.valorCampeaoLicitacao;
            return existe.save();
        }
        else {
            return this.intelModel.create({
                descricaoItem,
                nossoLanceOficial: data.nossoLanceOficial,
                valorCampeaoLicitacao: data.valorCampeaoLicitacao
            });
        }
    }
};
exports.FornecedorService = FornecedorService;
exports.FornecedorService = FornecedorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(fornecedor_schema_1.Fornecedor.name)),
    __param(1, (0, mongoose_1.InjectModel)(fornecedor_schema_1.ProdutoBase.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], FornecedorService);
//# sourceMappingURL=fornecedor.service.js.map