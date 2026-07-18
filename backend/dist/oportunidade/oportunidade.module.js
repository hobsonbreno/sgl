"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OportunidadeModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const oportunidade_service_1 = require("./oportunidade.service");
const oportunidade_controller_1 = require("./oportunidade.controller");
const oportunidade_schema_1 = require("./oportunidade.schema");
let OportunidadeModule = class OportunidadeModule {
};
exports.OportunidadeModule = OportunidadeModule;
exports.OportunidadeModule = OportunidadeModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: oportunidade_schema_1.Oportunidade.name, schema: oportunidade_schema_1.OportunidadeSchema }])],
        controllers: [oportunidade_controller_1.OportunidadeController],
        providers: [oportunidade_service_1.OportunidadeService],
        exports: [mongoose_1.MongooseModule, oportunidade_service_1.OportunidadeService],
    })
], OportunidadeModule);
//# sourceMappingURL=oportunidade.module.js.map