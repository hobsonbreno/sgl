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
exports.FinanceiroService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const financeiro_schema_1 = require("./financeiro.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
const produto_schema_1 = require("../produto/produto.schema");
const cotacao_schema_1 = require("../cotacao/cotacao.schema");
let FinanceiroService = class FinanceiroService {
    transacaoModel;
    oportunidadeModel;
    produtoModel;
    cotacaoModel;
    constructor(transacaoModel, oportunidadeModel, produtoModel, cotacaoModel) {
        this.transacaoModel = transacaoModel;
        this.oportunidadeModel = oportunidadeModel;
        this.produtoModel = produtoModel;
        this.cotacaoModel = cotacaoModel;
    }
    async create(createDto) {
        const created = new this.transacaoModel(createDto);
        return created.save();
    }
    async findAll() {
        return this.transacaoModel
            .find()
            .sort({ dataVencimento: 1 })
            .populate('oportunidadeId', 'orgaoNome objetoCompra numeroControlePNCP')
            .exec();
    }
    async findResumo() {
        const transacoes = await this.transacaoModel.find().exec();
        let receitasPendentes = 0;
        let receitasPagas = 0;
        let despesasPendentes = 0;
        let despesasPagas = 0;
        transacoes.forEach((t) => {
            if (t.tipo === 'RECEITA') {
                if (t.status === 'PAGO')
                    receitasPagas += t.valor;
                else
                    receitasPendentes += t.valor;
            }
            else {
                if (t.status === 'PAGO')
                    despesasPagas += t.valor;
                else
                    despesasPendentes += t.valor;
            }
        });
        const oportunidades = await this.oportunidadeModel
            .find({ kanbanStatus: { $ne: 'EXCLUIDA' } })
            .exec();
        const produtos = await this.produtoModel.find().exec();
        let valorNovasOportunidades = 0;
        let saldoProjetadoKanban = 0;
        let faturamentoAReceberKanban = 0;
        for (const op of oportunidades) {
            if (op.kanbanStatus === 'A_FAZER') {
                valorNovasOportunidades += op.valorTotalEstimado || 0;
            }
            else if (op.kanbanStatus === 'FAZENDO') {
                saldoProjetadoKanban += op.valorTotalEstimado || 0;
            }
            else if ([
                'FEITO',
                'NEGOCIACAO',
                'HOMOLOGACAO',
                'NEGOCIO_FECHADO',
                'NEGOCIAÇÃO',
                'HOMOLOGAÇÃO',
                'NEGÓCIO FECHADO',
            ].includes(op.kanbanStatus)) {
                const prods = produtos.filter((p) => p.oportunidadeId === op._id.toString());
                let valorOp = 0;
                prods.forEach((p) => {
                    if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
                        valorOp += p.valorNossoLance * (p.quantidade || 1);
                    }
                });
                faturamentoAReceberKanban += valorOp;
            }
        }
        const saldoAtual = receitasPagas - despesasPagas;
        const saldoProjetado = saldoAtual + receitasPendentes - despesasPendentes + saldoProjetadoKanban;
        const receitasPendentesTotal = receitasPendentes + faturamentoAReceberKanban;
        return {
            receitasPendentes: receitasPendentesTotal,
            receitasPagas,
            despesasPendentes,
            despesasPagas,
            saldoAtual,
            saldoProjetado,
            valorNovasOportunidades,
        };
    }
    async findNegociosFechados() {
        const oportunidades = await this.oportunidadeModel
            .find({
            kanbanStatus: { $in: ['NEGOCIO_FECHADO', 'NEGÓCIO FECHADO'] },
        })
            .exec();
        const ids = oportunidades.map((o) => o._id.toString());
        const produtos = await this.produtoModel
            .find({ oportunidadeId: { $in: ids } })
            .exec();
        return oportunidades.map((op) => {
            const prods = produtos.filter((p) => p.oportunidadeId === op._id.toString());
            let valorTotalLancado = 0;
            prods.forEach((p) => {
                if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
                    valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
                }
            });
            return {
                _id: op._id,
                orgaoNome: op.orgaoNome,
                numeroControlePNCP: op.numeroControlePNCP,
                objetoCompra: op.objetoCompra,
                valorTotalLancado,
            };
        });
    }
    async receberNegocioFechado(oportunidadeId) {
        const op = await this.oportunidadeModel.findById(oportunidadeId).exec();
        if (!op)
            throw new Error('Oportunidade não encontrada');
        const produtos = await this.produtoModel
            .find({ oportunidadeId: op._id.toString() })
            .exec();
        let valorTotalLancado = 0;
        produtos.forEach((p) => {
            if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
                valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
            }
        });
        if (valorTotalLancado <= 0) {
            throw new Error('Não há lances válidos registrados para esta oportunidade.');
        }
        const cotacao = await this.cotacaoModel
            .findOne({ oportunidadeId: op._id })
            .exec();
        let custoTotal = 0;
        if (cotacao && cotacao.itens) {
            cotacao.itens.forEach((item) => {
                if (item.melhorPreco && item.melhorPreco.precoUnitario) {
                    custoTotal +=
                        Number(item.melhorPreco.precoUnitario) *
                            Number(item.quantidade || 1);
                }
            });
        }
        await this.create({
            oportunidadeId: op._id,
            tipo: 'RECEITA',
            descricao: `Faturamento Negócio: ${op.numeroControlePNCP}`,
            valor: valorTotalLancado,
            dataVencimento: new Date(),
            status: 'PENDENTE',
        });
        await this.transacaoModel.updateMany({ oportunidadeId: op._id, tipo: 'RECEITA' }, {
            status: 'PAGO',
            dataPagamento: new Date(),
            descricao: `Recebimento de Negócio: ${op.numeroControlePNCP}`,
        });
        if (custoTotal > 0) {
            await this.create({
                oportunidadeId: op._id,
                tipo: 'DESPESA',
                descricao: `Custo Fornecedores Negócio: ${op.numeroControlePNCP}`,
                valor: custoTotal,
                dataVencimento: new Date(),
                status: 'PENDENTE',
            });
        }
        op.kanbanStatus = 'ARQUIVADOS';
        await op.save();
        return op;
    }
    async findArquivados() {
        const oportunidades = await this.oportunidadeModel
            .find({
            kanbanStatus: { $in: ['ARQUIVADO', 'ARQUIVADOS'] },
        })
            .exec();
        const ids = oportunidades.map((o) => o._id.toString());
        const produtos = await this.produtoModel
            .find({ oportunidadeId: { $in: ids } })
            .exec();
        return oportunidades.map((op) => {
            const prods = produtos.filter((p) => p.oportunidadeId === op._id.toString());
            let valorTotalLancado = 0;
            prods.forEach((p) => {
                if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
                    valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
                }
            });
            return {
                _id: op._id,
                orgaoNome: op.orgaoNome,
                numeroControlePNCP: op.numeroControlePNCP,
                objetoCompra: op.objetoCompra,
                valorTotalLancado,
            };
        });
    }
    async estornarNegocio(oportunidadeId) {
        const op = await this.oportunidadeModel.findById(oportunidadeId).exec();
        if (!op)
            throw new Error('Oportunidade não encontrada');
        await this.transacaoModel
            .deleteMany({ oportunidadeId: op._id, tipo: 'RECEITA' })
            .exec();
        await this.transacaoModel
            .deleteMany({ oportunidadeId: op._id, tipo: 'DESPESA' })
            .exec();
        op.kanbanStatus = 'NEGOCIO_FECHADO';
        await op.save();
        return op;
    }
    async update(id, updateDto) {
        if (updateDto.status === 'PAGO' && !updateDto.dataPagamento) {
            updateDto.dataPagamento = new Date();
        }
        return this.transacaoModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();
    }
    async remove(id) {
        return this.transacaoModel.findByIdAndDelete(id).exec();
    }
};
exports.FinanceiroService = FinanceiroService;
exports.FinanceiroService = FinanceiroService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(financeiro_schema_1.TransacaoFinanceira.name)),
    __param(1, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __param(2, (0, mongoose_1.InjectModel)(produto_schema_1.Produto.name)),
    __param(3, (0, mongoose_1.InjectModel)(cotacao_schema_1.Cotacao.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], FinanceiroService);
//# sourceMappingURL=financeiro.service.js.map