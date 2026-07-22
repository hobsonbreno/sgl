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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OportunidadeDto = exports.PncpContratacaoRawDto = exports.UnidadeOrgaoRawDto = exports.OrgaoEntidadeRawDto = void 0;
exports.mapPncpParaOportunidade = mapPncpParaOportunidade;
const swagger_1 = require("@nestjs/swagger");
class OrgaoEntidadeRawDto {
    cnpj;
    razaoSocial;
}
exports.OrgaoEntidadeRawDto = OrgaoEntidadeRawDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrgaoEntidadeRawDto.prototype, "cnpj", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrgaoEntidadeRawDto.prototype, "razaoSocial", void 0);
class UnidadeOrgaoRawDto {
    ufSigla;
    municipioNome;
    codigoUnidade;
}
exports.UnidadeOrgaoRawDto = UnidadeOrgaoRawDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UnidadeOrgaoRawDto.prototype, "ufSigla", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UnidadeOrgaoRawDto.prototype, "municipioNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UnidadeOrgaoRawDto.prototype, "codigoUnidade", void 0);
class PncpContratacaoRawDto {
    numeroControlePNCP;
    dataEncerramentoProposta;
    dataAberturaProposta;
    valorTotalEstimado;
    numeroCompra;
    anoCompra;
    orgaoEntidade;
    unidadeOrgao;
    modalidadeId;
    modalidadeNome;
    situacaoCompraNome;
    objetoCompra;
    linkSistemaOrigem;
}
exports.PncpContratacaoRawDto = PncpContratacaoRawDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "numeroControlePNCP", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "dataEncerramentoProposta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "dataAberturaProposta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], PncpContratacaoRawDto.prototype, "valorTotalEstimado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "numeroCompra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], PncpContratacaoRawDto.prototype, "anoCompra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: OrgaoEntidadeRawDto, required: false }),
    __metadata("design:type", OrgaoEntidadeRawDto)
], PncpContratacaoRawDto.prototype, "orgaoEntidade", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UnidadeOrgaoRawDto, required: false }),
    __metadata("design:type", UnidadeOrgaoRawDto)
], PncpContratacaoRawDto.prototype, "unidadeOrgao", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], PncpContratacaoRawDto.prototype, "modalidadeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "modalidadeNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "situacaoCompraNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "objetoCompra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], PncpContratacaoRawDto.prototype, "linkSistemaOrigem", void 0);
class OportunidadeDto {
    numeroControlePNCP;
    tipo;
    modalidadeCodigo;
    modalidadeNome;
    orgaoCnpj;
    orgaoNome;
    uf;
    municipio;
    objetoCompra;
    unidadeCompradora;
    numeroCompraOrigem;
    anoCompraOrigem;
    valorTotalEstimado;
    dataAberturaProposta;
    dataEncerramentoProposta;
    linkSistemaOrigem;
    situacaoCompraNome;
    kanbanStatus;
}
exports.OportunidadeDto = OportunidadeDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "numeroControlePNCP", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "tipo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], OportunidadeDto.prototype, "modalidadeCodigo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "modalidadeNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "orgaoCnpj", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "orgaoNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "uf", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "municipio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "objetoCompra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "unidadeCompradora", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "numeroCompraOrigem", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], OportunidadeDto.prototype, "anoCompraOrigem", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], OportunidadeDto.prototype, "valorTotalEstimado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], OportunidadeDto.prototype, "dataAberturaProposta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], OportunidadeDto.prototype, "dataEncerramentoProposta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "linkSistemaOrigem", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "situacaoCompraNome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OportunidadeDto.prototype, "kanbanStatus", void 0);
function mapPncpParaOportunidade(raw) {
    const isDispensa = raw.modalidadeId === 8 || raw.modalidadeId === 9;
    return {
        numeroControlePNCP: raw.numeroControlePNCP,
        tipo: isDispensa ? 'dispensa' : 'licitacao',
        modalidadeCodigo: raw.modalidadeId || 0,
        modalidadeNome: raw.modalidadeNome || '',
        orgaoCnpj: raw.orgaoEntidade?.cnpj || '',
        orgaoNome: raw.orgaoEntidade?.razaoSocial || '',
        uf: raw.unidadeOrgao?.ufSigla || '',
        municipio: raw.unidadeOrgao?.municipioNome || '',
        unidadeCompradora: raw.unidadeOrgao?.codigoUnidade || '',
        numeroCompraOrigem: raw.numeroCompra || '',
        anoCompraOrigem: raw.anoCompra || 0,
        objetoCompra: raw.objetoCompra || '',
        valorTotalEstimado: raw.valorTotalEstimado || 0,
        dataAberturaProposta: raw.dataAberturaProposta ? new Date(raw.dataAberturaProposta) : undefined,
        dataEncerramentoProposta: raw.dataEncerramentoProposta ? new Date(raw.dataEncerramentoProposta) : undefined,
        linkSistemaOrigem: raw.linkSistemaOrigem || '',
        situacaoCompraNome: raw.situacaoCompraNome || '',
        kanbanStatus: 'A_FAZER'
    };
}
//# sourceMappingURL=pncp.dto.js.map