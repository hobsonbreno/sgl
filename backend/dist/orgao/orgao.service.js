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
exports.OrgaoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const orgao_schema_1 = require("./orgao.schema");
let OrgaoService = class OrgaoService {
    model;
    constructor(model) {
        this.model = model;
    }
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        const data = await this.model.find().sort({ dataInclusao: -1 }).skip(skip).limit(limit).exec();
        const total = await this.model.countDocuments().exec();
        const totalPages = Math.ceil(total / limit) || 1;
        return { data, total, totalPages, currentPage: page };
    }
};
exports.OrgaoService = OrgaoService;
exports.OrgaoService = OrgaoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(orgao_schema_1.Orgao.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OrgaoService);
//# sourceMappingURL=orgao.service.js.map