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
    constructor(model) {
        this.model = model;
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
    async findAll(categoria, busca) {
        const filters = {};
        if (categoria)
            filters.categorias = categoria;
        if (busca) {
            filters.$or = [
                { razaoSocial: { $regex: busca, $options: 'i' } },
                { cnpj: { $regex: busca, $options: 'i' } }
            ];
        }
        return this.model.find(filters).limit(50).exec();
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
};
exports.FornecedorService = FornecedorService;
exports.FornecedorService = FornecedorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(fornecedor_schema_1.Fornecedor.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], FornecedorService);
//# sourceMappingURL=fornecedor.service.js.map