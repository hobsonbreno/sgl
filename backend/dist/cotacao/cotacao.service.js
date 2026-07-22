"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CotacaoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = __importStar(require("mongoose"));
const cotacao_schema_1 = require("./cotacao.schema");
const fornecedor_service_1 = require("../fornecedor/fornecedor.service");
let CotacaoService = class CotacaoService {
    model;
    fornecedorService;
    constructor(model, fornecedorService) {
        this.model = model;
        this.fornecedorService = fornecedorService;
    }
    async createOrGet(oportunidadeId, initialItems = []) {
        const existe = await this.model.findOne({ oportunidadeId }).exec();
        if (existe) {
            if (existe.itens.length === 0 && initialItems.length > 0) {
                const itens = initialItems.map(i => ({
                    produtoId: i._id,
                    descricaoItem: i.descricao,
                    quantidade: i.quantidade || 1,
                    unidadeMedida: i.unidadeMedida || 'UN',
                    valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
                    precosFornecedores: []
                }));
                existe.itens = itens;
                await existe.save();
            }
            return existe;
        }
        const itens = initialItems.map(i => ({
            produtoId: i._id,
            descricaoItem: i.descricao,
            quantidade: i.quantidade || 1,
            unidadeMedida: i.unidadeMedida || 'UN',
            valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
            precosFornecedores: []
        }));
        const nova = new this.model({
            oportunidadeId,
            itens
        });
        return nova.save();
    }
    async findOne(id) {
        const doc = await this.model.findById(id).populate('itens.precosFornecedores.fornecedorId').exec();
        if (!doc)
            throw new common_1.NotFoundException('Cotação não encontrada');
        return doc;
    }
    async findByOportunidade(oportunidadeId) {
        const doc = await this.model.findOne({ oportunidadeId }).populate('itens.precosFornecedores.fornecedorId').exec();
        if (!doc)
            throw new common_1.NotFoundException('Cotação não encontrada para esta oportunidade');
        return doc;
    }
    async updatePreco(cotacaoId, itemId, precoData) {
        const doc = await this.model.findById(cotacaoId).exec();
        if (!doc)
            throw new common_1.NotFoundException('Cotação não encontrada');
        const item = doc.itens.find(i => i._id.toString() === itemId);
        if (!item)
            throw new common_1.NotFoundException('Item não encontrado na cotação');
        const fIdx = item.precosFornecedores.findIndex(p => p.fornecedorId.toString() === precoData.fornecedorId);
        if (fIdx >= 0) {
            item.precosFornecedores[fIdx].precoUnitario = precoData.precoUnitario;
            item.precosFornecedores[fIdx].fatorEmbalagem = precoData.fatorEmbalagem;
            item.precosFornecedores[fIdx].precoEmbalagem = precoData.precoEmbalagem;
            item.precosFornecedores[fIdx].nomeEmbalagem = precoData.nomeEmbalagem;
            item.precosFornecedores[fIdx].freteIncluso = precoData.freteIncluso;
            item.precosFornecedores[fIdx].prazoPagamento = precoData.prazoPagamento;
            item.precosFornecedores[fIdx].permiteParcelamento = precoData.permiteParcelamento;
            item.precosFornecedores[fIdx].observacao = precoData.observacao;
        }
        else {
            item.precosFornecedores.push({
                fornecedorId: new mongoose_2.default.Types.ObjectId(precoData.fornecedorId),
                precoUnitario: precoData.precoUnitario,
                fatorEmbalagem: precoData.fatorEmbalagem,
                precoEmbalagem: precoData.precoEmbalagem,
                nomeEmbalagem: precoData.nomeEmbalagem,
                freteIncluso: precoData.freteIncluso,
                prazoPagamento: precoData.prazoPagamento,
                permiteParcelamento: precoData.permiteParcelamento,
                observacao: precoData.observacao
            });
        }
        let melhor;
        for (const p of item.precosFornecedores) {
            if (!melhor) {
                melhor = p;
                continue;
            }
            if (p.precoUnitario < melhor.precoUnitario) {
                melhor = p;
            }
            else if (p.precoUnitario === melhor.precoUnitario) {
                let pScore = 0;
                let melhorScore = 0;
                if (p.freteIncluso)
                    pScore += 10;
                if (melhor.freteIncluso)
                    melhorScore += 10;
                if (p.permiteParcelamento)
                    pScore += 5;
                if (melhor.permiteParcelamento)
                    melhorScore += 5;
                pScore += (p.prazoPagamento || 0) * 0.1;
                melhorScore += (melhor.prazoPagamento || 0) * 0.1;
                if (pScore > melhorScore) {
                    melhor = p;
                }
            }
        }
        item.melhorPreco = melhor ? { fornecedorId: melhor.fornecedorId, precoUnitario: melhor.precoUnitario } : undefined;
        doc.valorTotalMelhorCotacao = parseFloat(doc.itens.reduce((total, it) => {
            if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
                return total + (it.melhorPreco.precoUnitario * (it.quantidade || 1));
            }
            return total;
        }, 0).toFixed(2));
        await doc.save();
        await this.fornecedorService.registrarHistoricoPreco(precoData.fornecedorId, {
            descricaoItem: item.descricaoItem,
            precoUnitario: precoData.precoUnitario,
            oportunidadeId: doc.oportunidadeId.toString()
        });
        return this.findOne(cotacaoId);
    }
    async removePreco(cotacaoId, itemId, fornecedorId) {
        const doc = await this.model.findById(cotacaoId).exec();
        if (!doc)
            throw new common_1.NotFoundException('Cotação não encontrada');
        const item = doc.itens.find(i => i._id.toString() === itemId);
        if (!item)
            throw new common_1.NotFoundException('Item não encontrado na cotação');
        item.precosFornecedores = item.precosFornecedores.filter(p => p.fornecedorId.toString() !== fornecedorId);
        let melhor;
        for (const p of item.precosFornecedores) {
            if (!melhor) {
                melhor = p;
                continue;
            }
            if (p.precoUnitario < melhor.precoUnitario) {
                melhor = p;
            }
            else if (p.precoUnitario === melhor.precoUnitario) {
                let pScore = 0;
                let melhorScore = 0;
                if (p.freteIncluso)
                    pScore += 10;
                if (melhor.freteIncluso)
                    melhorScore += 10;
                if (p.permiteParcelamento)
                    pScore += 5;
                if (melhor.permiteParcelamento)
                    melhorScore += 5;
                pScore += (p.prazoPagamento || 0) * 0.1;
                melhorScore += (melhor.prazoPagamento || 0) * 0.1;
                if (pScore > melhorScore) {
                    melhor = p;
                }
            }
        }
        item.melhorPreco = melhor ? { fornecedorId: melhor.fornecedorId, precoUnitario: melhor.precoUnitario } : undefined;
        doc.valorTotalMelhorCotacao = doc.itens.reduce((total, it) => {
            if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
                return total + (it.melhorPreco.precoUnitario * (it.quantidade || 1));
            }
            return total;
        }, 0);
        await doc.save();
        return this.findOne(cotacaoId);
    }
};
exports.CotacaoService = CotacaoService;
exports.CotacaoService = CotacaoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cotacao_schema_1.Cotacao.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        fornecedor_service_1.FornecedorService])
], CotacaoService);
//# sourceMappingURL=cotacao.service.js.map