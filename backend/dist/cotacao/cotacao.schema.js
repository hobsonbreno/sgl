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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CotacaoSchema = exports.Cotacao = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
let Cotacao = class Cotacao {
    oportunidadeId;
    itens;
    valorTotalMelhorCotacao;
};
exports.Cotacao = Cotacao;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.default.Schema.Types.ObjectId,
        ref: 'Oportunidade',
        required: true,
    }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Cotacao.prototype, "oportunidadeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                _id: { type: mongoose_2.default.Schema.Types.ObjectId, auto: true },
                produtoId: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Produto' },
                descricaoItem: String,
                quantidade: Number,
                unidadeMedida: String,
                valorUnitarioEstimado: Number,
                precosFornecedores: [
                    {
                        fornecedorId: {
                            type: mongoose_2.default.Schema.Types.ObjectId,
                            ref: 'Fornecedor',
                        },
                        precoUnitario: Number,
                        fatorEmbalagem: Number,
                        precoEmbalagem: Number,
                        nomeEmbalagem: String,
                        freteIncluso: { type: Boolean, default: false },
                        prazoPagamento: { type: Number, default: 0 },
                        permiteParcelamento: { type: Boolean, default: false },
                        observacao: String,
                        desclassificado: { type: Boolean, default: false },
                        justificativaDesclassificacao: String,
                        linkProduto: String,
                    },
                ],
                melhorPreco: {
                    fornecedorId: {
                        type: mongoose_2.default.Schema.Types.ObjectId,
                        ref: 'Fornecedor',
                    },
                    precoUnitario: Number,
                },
            },
        ],
    }),
    __metadata("design:type", Array)
], Cotacao.prototype, "itens", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Cotacao.prototype, "valorTotalMelhorCotacao", void 0);
exports.Cotacao = Cotacao = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Cotacao);
exports.CotacaoSchema = mongoose_1.SchemaFactory.createForClass(Cotacao);
//# sourceMappingURL=cotacao.schema.js.map