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
exports.OportunidadeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const oportunidade_schema_1 = require("./oportunidade.schema");
let OportunidadeService = class OportunidadeService {
    model;
    constructor(model) {
        this.model = model;
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
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        const data = await this.model.find(filters).skip(skip).limit(limit).exec();
        const total = await this.model.countDocuments(filters).exec();
        return { data, total };
    }
    async findOne(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        return doc;
    }
    async updateStatus(id, kanbanStatus) {
        const statusValidos = ['A_FAZER', 'FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'];
        if (!statusValidos.includes(kanbanStatus)) {
            throw new common_1.BadRequestException('Status inválido');
        }
        const doc = await this.model.findByIdAndUpdate(id, { kanbanStatus, dataMudancaStatus: new Date() }, { new: true }).exec();
        if (!doc)
            throw new common_1.NotFoundException('Oportunidade não encontrada');
        return doc;
    }
};
exports.OportunidadeService = OportunidadeService;
exports.OportunidadeService = OportunidadeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OportunidadeService);
//# sourceMappingURL=oportunidade.service.js.map