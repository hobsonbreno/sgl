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
var ReceitaFederalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceitaFederalService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const receita_federal_schema_1 = require("./receita-federal.schema");
const https = __importStar(require("https"));
const unzipper = __importStar(require("unzipper"));
const csv_parse_1 = require("csv-parse");
const iconv = __importStar(require("iconv-lite"));
let ReceitaFederalService = ReceitaFederalService_1 = class ReceitaFederalService {
    empresaDataLakeModel;
    logger = new common_1.Logger(ReceitaFederalService_1.name);
    constructor(empresaDataLakeModel) {
        this.empresaDataLakeModel = empresaDataLakeModel;
    }
    async runETLPipeline() {
        this.logger.log('--- INICIANDO PIPELINE DE ETL DO DATA LAKE ---');
        const ufAlvo = 'CE';
        const statusAlvo = '02';
        const mapMunicipios = await this.loadDicionario('https://dadosabertos.rfb.gov.br/CNPJ/Municipios.zip', 'Municipios');
        const mapCnaes = await this.loadDicionario('https://dadosabertos.rfb.gov.br/CNPJ/Cnaes.zip', 'Cnaes');
        this.logger.log('--- FASE 1: EXTRAINDO ESTABELECIMENTOS ---');
        const pacotes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (const i of [0]) {
            await this.processEstabelecimentos(`https://dadosabertos.rfb.gov.br/CNPJ/Estabelecimentos${i}.zip`, ufAlvo, statusAlvo, mapMunicipios, mapCnaes);
        }
        this.logger.log('--- FASE 2: PREPARANDO JOIN DE EMPRESAS ---');
        const cnpjBasicosValidos = await this.empresaDataLakeModel.distinct('cnpj_basico', { uf: ufAlvo }).exec();
        const setCnpjBasicos = new Set(cnpjBasicosValidos);
        this.logger.log(`${setCnpjBasicos.size} CNPJs Básicos do Estado ${ufAlvo} carregados na memória.`);
        this.logger.log('--- FASE 3: EXTRAINDO RAZÃO SOCIAL (EMPRESAS) ---');
        for (const i of [0]) {
            await this.processEmpresas(`https://dadosabertos.rfb.gov.br/CNPJ/Empresas${i}.zip`, setCnpjBasicos);
        }
        this.logger.log('--- PIPELINE CONCLUÍDO COM SUCESSO! ---');
    }
    async loadDicionario(url, nome) {
        this.logger.log(`Carregando dicionário na memória: ${nome}...`);
        const map = new Map();
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200)
                    return reject(`Falha no download de ${nome}`);
                const unzip = res.pipe(unzipper.Parse());
                unzip.on('entry', async (entry) => {
                    const csvParser = entry.pipe(iconv.decodeStream('win1252')).pipe((0, csv_parse_1.parse)({ delimiter: ';', relax_quotes: true, quote: '"' }));
                    for await (const row of csvParser) {
                        map.set(String(row[0]).trim(), String(row[1]).trim());
                    }
                    entry.autodrain();
                });
                unzip.on('close', () => {
                    this.logger.log(`Dicionário ${nome} carregado: ${map.size} registros.`);
                    resolve(map);
                });
            });
        });
    }
    async processEstabelecimentos(url, targetUf, targetStatus, mapMunicipios, mapCnaes) {
        this.logger.log(`Baixando Estabelecimentos: ${url}`);
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200)
                    return resolve(false);
                const unzip = res.pipe(unzipper.Parse());
                unzip.on('entry', async (entry) => {
                    const csvParser = entry.pipe(iconv.decodeStream('win1252')).pipe((0, csv_parse_1.parse)({ delimiter: ';', relax_quotes: true, quote: '"' }));
                    let bulkOps = [];
                    for await (const row of csvParser) {
                        const uf = String(row[19]).trim().toUpperCase();
                        const situacao = String(row[5]).trim();
                        if (uf === targetUf && situacao === targetStatus) {
                            const cnpjBase = String(row[0]).padStart(8, '0');
                            const cnpjOrdem = String(row[1]).padStart(4, '0');
                            const cnpjDv = String(row[2]).padStart(2, '0');
                            const cnpjCompleto = `${cnpjBase}${cnpjOrdem}${cnpjDv}`;
                            const cnae = String(row[11]).trim();
                            const muniCod = String(row[20]).trim();
                            const telefone = row[21] && row[22] ? `${row[21]}${row[22]}`.trim() : undefined;
                            bulkOps.push({
                                updateOne: {
                                    filter: { cnpj: cnpjCompleto },
                                    update: { $set: {
                                            cnpj: cnpjCompleto, cnpj_basico: cnpjBase, cnae_principal: cnae, situacao_cadastral: situacao,
                                            uf: uf, cep: String(row[18]).trim(), telefone: telefone, email: String(row[27]).trim().toLowerCase(),
                                            logradouro: String(row[14]).trim(), numero: String(row[15]).trim(), bairro: String(row[17]).trim(),
                                            municipio: mapMunicipios.get(muniCod) || muniCod,
                                            cnae_descricao: mapCnaes.get(cnae) || 'Não informada'
                                        } }, upsert: true
                                }
                            });
                            if (bulkOps.length >= 1000) {
                                csvParser.pause();
                                try {
                                    await this.empresaDataLakeModel.bulkWrite(bulkOps, { ordered: false });
                                    bulkOps = [];
                                }
                                catch (err) { }
                                finally {
                                    csvParser.resume();
                                }
                            }
                        }
                    }
                    if (bulkOps.length > 0)
                        await this.empresaDataLakeModel.bulkWrite(bulkOps, { ordered: false });
                    entry.autodrain();
                });
                unzip.on('close', () => resolve(true));
            }).on('error', () => resolve(false));
        });
    }
    async processEmpresas(url, setCnpjBasicos) {
        this.logger.log(`Baixando Empresas: ${url}`);
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200)
                    return resolve(false);
                const unzip = res.pipe(unzipper.Parse());
                unzip.on('entry', async (entry) => {
                    const csvParser = entry.pipe(iconv.decodeStream('win1252')).pipe((0, csv_parse_1.parse)({ delimiter: ';', relax_quotes: true, quote: '"' }));
                    let bulkOps = [];
                    for await (const row of csvParser) {
                        const cnpjBase = String(row[0]).padStart(8, '0');
                        if (setCnpjBasicos.has(cnpjBase)) {
                            bulkOps.push({
                                updateMany: {
                                    filter: { cnpj_basico: cnpjBase },
                                    update: { $set: {
                                            razao_social: String(row[1]).trim(),
                                            capital_social: Number(String(row[4]).replace(',', '.')) || 0
                                        } }
                                }
                            });
                            if (bulkOps.length >= 1000) {
                                csvParser.pause();
                                try {
                                    await this.empresaDataLakeModel.bulkWrite(bulkOps, { ordered: false });
                                    bulkOps = [];
                                }
                                catch (err) { }
                                finally {
                                    csvParser.resume();
                                }
                            }
                        }
                    }
                    if (bulkOps.length > 0)
                        await this.empresaDataLakeModel.bulkWrite(bulkOps, { ordered: false });
                    entry.autodrain();
                });
                unzip.on('close', () => resolve(true));
            }).on('error', () => resolve(false));
        });
    }
};
exports.ReceitaFederalService = ReceitaFederalService;
exports.ReceitaFederalService = ReceitaFederalService = ReceitaFederalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(receita_federal_schema_1.EmpresaDataLake.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ReceitaFederalService);
//# sourceMappingURL=receita-federal.service.js.map