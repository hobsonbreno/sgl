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
var SupplierDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const fornecedor_schema_1 = require("./fornecedor.schema");
const perfil_busca_schema_1 = require("../perfil-busca/perfil-busca.schema");
let SupplierDiscoveryService = SupplierDiscoveryService_1 = class SupplierDiscoveryService {
    fornecedorModel;
    produtoBaseModel;
    perfilBuscaModel;
    logger = new common_1.Logger(SupplierDiscoveryService_1.name);
    constructor(fornecedorModel, produtoBaseModel, perfilBuscaModel) {
        this.fornecedorModel = fornecedorModel;
        this.produtoBaseModel = produtoBaseModel;
        this.perfilBuscaModel = perfilBuscaModel;
    }
    normalizeStr(str) {
        if (!str)
            return '';
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    }
    sanitizeQuery(descricao) {
        let q = descricao.toUpperCase();
        const junk = [
            'DADOS DE IDENTIFICACAO', 'MARCA DO FABRICANTE', 'PRAZO DE VALIDADE',
            'PESO LIQUIDO', 'DATA DE FABRICACAO', 'NUMERO DO LOTE', 'INFORMACAO NUTRICIONAL',
            'RESOLUCAO', 'CNNPA', 'REGISTRO NO MINISTERIO DA SAUDE', 'PORTARIA', 'ABIC',
            'MARCAS E CARIMBOS OFICIAIS', 'REGISTRO SIF', 'SIE', 'SIM', 'CERTIFICADO DA VIGILANCIA SANITARIA',
            'PROCEDENCIA', 'ACONDICIONADOS EM CAIXAS', 'ACONDICIONADA EM CAIXAS', 'ACONDICIONADO EM PLASTICO', 'EMBALAGEM', 'EMBALADO', 'EMBALADOS'
        ];
        let cutoff = q.length;
        junk.forEach(j => {
            const idx = q.indexOf(j);
            if (idx !== -1 && idx < cutoff)
                cutoff = idx;
        });
        q = q.substring(0, cutoff).replace(/[^\w\sÀ-ÿ]/g, '').trim();
        const parts = q.split(' ').filter(p => p.length > 2);
        let clean = parts.slice(0, 2).join(' ');
        if (!clean)
            clean = descricao.split(' ')[0];
        return clean;
    }
    getSerpApiKeys() {
        const keys = process.env.SERPAPI_KEYS || '';
        return keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    async discoverSuppliersForProduct(descricao, location) {
        const query = this.sanitizeQuery(descricao);
        this.logger.log(`Iniciando Descoberta B2B Raiz (Google + BrasilAPI) para: ${query}`);
        const keys = this.getSerpApiKeys();
        if (keys.length === 0) {
            this.logger.warn('Nenhuma chave da SerpApi configurada. O robô precisa dela para pesquisar no Google.');
            return [];
        }
        const apiKey = keys[0];
        const ativo = await this.perfilBuscaModel.findOne({ ativo: true }).exec();
        const ufsPermitidas = ativo?.estadosBuscaFornecedores?.map(u => this.normalizeStr(u)) || [];
        const municipiosPermitidos = ativo?.municipiosBuscaFornecedores?.map(m => this.normalizeStr(m)) || [];
        const ufAlvo = ufsPermitidas.length > 0 ? ufsPermitidas[0] : 'CE';
        const municipioAlvo = municipiosPermitidos.length > 0 ? municipiosPermitidos[0] : '';
        const regiaoQuery = municipioAlvo ? `(${municipioAlvo} ${ufAlvo})` : `(${ufAlvo})`;
        const localQuery = `site:cnpj.biz OR site:casadosdados.com.br (Atacadista OR Indústria OR Fábrica OR Distribuidora) (${query}) ${regiaoQuery}`;
        let cnpjsEncontrados = new Set();
        try {
            this.logger.log(`Pesquisando no Google: ${localQuery}`);
            const serpUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(localQuery)}&api_key=${apiKey}&hl=pt&gl=br&num=20`;
            const res = await fetch(serpUrl);
            const data = await res.json();
            if (data.error) {
                this.logger.error(`Erro do SerpApi: ${data.error}`);
                return [];
            }
            const results = data.organic_results || [];
            for (const r of results) {
                const textToSearch = (r.snippet || '') + ' ' + (r.title || '');
                const cnpjMatch = textToSearch.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}|\d{14}/);
                if (cnpjMatch) {
                    let cleanCnpj = cnpjMatch[0].replace(/\D/g, '');
                    if (cleanCnpj.length === 14) {
                        cnpjsEncontrados.add(cleanCnpj);
                    }
                }
            }
        }
        catch (e) {
            this.logger.error(`Erro ao consultar Google (SerpApi): ${e.message}`);
        }
        if (cnpjsEncontrados.size === 0) {
            this.logger.warn(`Nenhum CNPJ raiz encontrado na web para ${query} em ${regiaoQuery}.`);
            return [];
        }
        this.logger.log(`Encontrados ${cnpjsEncontrados.size} CNPJs na Web. Limpando dados na Receita Federal (BrasilAPI)...`);
        const fornecedoresRelevantes = [];
        const palavrasChaveNicho = ['ATACADISTA', 'DISTRIBUIDOR', 'DISTRIBUICAO', 'INDUSTRIA', 'FABRICA', 'MERCANTIL', 'ATACADO', 'COMERCIO'];
        for (const cnpj of Array.from(cnpjsEncontrados)) {
            try {
                const resBrasilApi = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
                if (!resBrasilApi.ok)
                    continue;
                const dadosCnpj = await resBrasilApi.json();
                const municipioEmpresa = this.normalizeStr(dadosCnpj.municipio);
                const ufEmpresa = this.normalizeStr(dadosCnpj.uf);
                if (ufsPermitidas.length > 0 && !ufsPermitidas.includes(ufEmpresa))
                    continue;
                if (municipiosPermitidos.length > 0 && !municipiosPermitidos.includes(municipioEmpresa))
                    continue;
                let cnaes = [dadosCnpj.cnae_fiscal_descricao];
                if (dadosCnpj.cnaes_secundarios) {
                    cnaes = cnaes.concat(dadosCnpj.cnaes_secundarios.map((c) => c.descricao));
                }
                const textoCnaes = this.normalizeStr(cnaes.join(' '));
                const nichoValido = palavrasChaveNicho.some(palavra => textoCnaes.includes(palavra));
                if (!nichoValido) {
                    continue;
                }
                let fornecedor = await this.fornecedorModel.findOne({ cnpj: cnpj }).exec();
                const telefoneExtraido = dadosCnpj.ddd_telefone_1
                    ? `(${dadosCnpj.ddd_telefone_1.substring(0, 2)}) ${dadosCnpj.ddd_telefone_1.substring(2, 7)}-${dadosCnpj.ddd_telefone_1.substring(7)}`
                    : '(00) 00000-0000';
                const emailExtraido = dadosCnpj.email || 'Nao informado';
                if (!fornecedor) {
                    fornecedor = await this.fornecedorModel.create({
                        razaoSocial: dadosCnpj.razao_social,
                        cnpj: cnpj,
                        cep: dadosCnpj.cep,
                        origem: 'bot',
                        telefone: telefoneExtraido,
                        email: emailExtraido,
                        site: '',
                        portifolio: '',
                        endereco: dadosCnpj.logradouro + (dadosCnpj.numero ? `, ${dadosCnpj.numero}` : ''),
                        bairro: dadosCnpj.bairro,
                        cidade: dadosCnpj.municipio,
                        uf: dadosCnpj.uf,
                        categorias: [dadosCnpj.cnae_fiscal_descricao]
                    });
                    this.logger.log(`✅ Novo Fornecedor Raiz cadastrado: ${fornecedor.razaoSocial}`);
                }
                else {
                    if (fornecedor.telefone === '(00) 00000-0000' && telefoneExtraido !== '(00) 00000-0000') {
                        fornecedor.telefone = telefoneExtraido;
                    }
                    if (!fornecedor.email && emailExtraido !== 'Nao informado') {
                        fornecedor.email = emailExtraido;
                    }
                    await fornecedor.save();
                }
                const precoUnit = (query.length * 1.5) + (Math.random() * 5);
                fornecedoresRelevantes.push({
                    razaoSocial: fornecedor.razaoSocial,
                    id: fornecedor._id.toString(),
                    precoUnitario: precoUnit,
                    linkProduto: `https://cnpj.biz/${cnpj}`
                });
            }
            catch (err) {
            }
        }
        return fornecedoresRelevantes;
    }
};
exports.SupplierDiscoveryService = SupplierDiscoveryService;
exports.SupplierDiscoveryService = SupplierDiscoveryService = SupplierDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(fornecedor_schema_1.Fornecedor.name)),
    __param(1, (0, mongoose_1.InjectModel)(fornecedor_schema_1.ProdutoBase.name)),
    __param(2, (0, mongoose_1.InjectModel)(perfil_busca_schema_1.PerfilBusca.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], SupplierDiscoveryService);
//# sourceMappingURL=supplier-discovery.service.js.map