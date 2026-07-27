"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgaoModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const orgao_service_1 = require("./orgao.service");
const orgao_controller_1 = require("./orgao.controller");
const orgao_schema_1 = require("./orgao.schema");
let OrgaoModule = class OrgaoModule {
};
exports.OrgaoModule = OrgaoModule;
exports.OrgaoModule = OrgaoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: orgao_schema_1.Orgao.name, schema: orgao_schema_1.OrgaoSchema }]),
        ],
        controllers: [orgao_controller_1.OrgaoController],
        providers: [orgao_service_1.OrgaoService],
        exports: [mongoose_1.MongooseModule, orgao_service_1.OrgaoService],
    })
], OrgaoModule);
//# sourceMappingURL=orgao.module.js.map