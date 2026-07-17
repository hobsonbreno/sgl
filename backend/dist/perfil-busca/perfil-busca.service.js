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
exports.PerfilBuscaService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const perfil_busca_schema_1 = require("./perfil-busca.schema");
let PerfilBuscaService = class PerfilBuscaService {
    model;
    constructor(model) {
        this.model = model;
    }
    async create(data) {
        if (!data.modalidades || data.modalidades.length === 0) {
            throw new common_1.BadRequestException('Pelo menos 1 modalidade é obrigatória.');
        }
        return this.model.create(data);
    }
    async findAll() {
        return this.model.find().exec();
    }
    async findOne(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Perfil não encontrado');
        return doc;
    }
    async update(id, data) {
        if (data.modalidades && data.modalidades.length === 0) {
            throw new common_1.BadRequestException('Pelo menos 1 modalidade é obrigatória.');
        }
        const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
        if (!doc)
            throw new common_1.NotFoundException('Perfil não encontrado');
        return doc;
    }
    async toggleActive(id) {
        const doc = await this.model.findById(id).exec();
        if (!doc)
            throw new common_1.NotFoundException('Perfil não encontrado');
        doc.ativo = !doc.ativo;
        return doc.save();
    }
    async remove(id) {
        await this.model.findByIdAndDelete(id).exec();
    }
};
exports.PerfilBuscaService = PerfilBuscaService;
exports.PerfilBuscaService = PerfilBuscaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(perfil_busca_schema_1.PerfilBusca.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PerfilBuscaService);
//# sourceMappingURL=perfil-busca.service.js.map