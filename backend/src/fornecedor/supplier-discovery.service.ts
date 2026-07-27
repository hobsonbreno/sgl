import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Fornecedor, FornecedorDocument, ProdutoBase, ProdutoBaseDocument } from './fornecedor.schema';
import { PerfilBusca, PerfilBuscaDocument } from '../perfil-busca/perfil-busca.schema';

@Injectable()
export class SupplierDiscoveryService {
  private readonly logger = new Logger(SupplierDiscoveryService.name);

  constructor(
    @InjectModel(Fornecedor.name) private fornecedorModel: Model<FornecedorDocument>,
    @InjectModel(ProdutoBase.name) private produtoBaseModel: Model<ProdutoBaseDocument>,
    @InjectModel(PerfilBusca.name) private perfilBuscaModel: Model<PerfilBuscaDocument>,
  ) { }

  private normalizeStr(str: string): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  }

  private sanitizeQuery(descricao: string): string {
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
      if (idx !== -1 && idx < cutoff) cutoff = idx;
    });

    q = q.substring(0, cutoff).replace(/[^\w\sÀ-ÿ]/g, '').trim();
    const parts = q.split(' ').filter(p => p.length > 2);
    // Extrai as 2 primeiras palavras chave
    let clean = parts.slice(0, 2).join(' ');
    if (!clean) clean = descricao.split(' ')[0];
    return clean;
  }

  private getSerpApiKeys(): string[] {
    const keys = process.env.SERPAPI_KEYS || '';
    return keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  async discoverSuppliersForProduct(descricao: string, location?: string): Promise<{ razaoSocial: string; precoUnitario: number; linkProduto: string; id: string }[]> {
    const query = this.sanitizeQuery(descricao);
    this.logger.log(`Iniciando Descoberta B2B Raiz (MongoDB Local) para: ${query}`);

    // 1. CARREGAR PERFIL DE BUSCA
    const ativo = await this.perfilBuscaModel.findOne({ ativo: true }).exec();
    const ufsPermitidas = ativo?.estadosBuscaFornecedores?.map(u => this.normalizeStr(u)) || [];
    const municipiosPermitidos = ativo?.municipiosBuscaFornecedores?.map(m => this.normalizeStr(m)) || [];

    const ufAlvo = ufsPermitidas.length > 0 ? ufsPermitidas[0] : 'CE';
    
    // Configura a query do MongoDB
    const mongoQuery: any = { 
      uf: ufAlvo, 
      situacao_cadastral: '02' // ATIVA
    };

    if (municipiosPermitidos.length > 0 && municipiosPermitidos[0] !== '') {
      // O código do município no DataLake pode ser numérico, mas vamos buscar textualmente se necessário
      // mongoQuery.municipio = municipiosPermitidos[0]; 
    }

    // Filtro Textual Avançado (Razão Social ou CNAE) usando regex
    // Vamos procurar por empresas que contenham a query do produto (Ex: "BOTA") 
    // E que sejam Atacadistas, Distribuidoras ou Industrias
    const regexQuery = new RegExp(query, 'i');
    const regexNicho = /ATACADISTA|DISTRIBUIDORA|INDÚSTRIA|INDUSTRIA|FÁBRICA|FABRICA/i;

    mongoQuery.$or = [
      { razao_social: regexQuery },
      { cnae_descricao: regexQuery }
    ];

    this.logger.log(`Consultando Data Lake Local...`);
    
    // Injetamos o Model do Data Lake dinamicamente aqui (já importado via módulo)
    const empresaDataLakeModel = this.fornecedorModel.db.model('EmpresaDataLake');
    
    // Busca limitada aos top 20 para ser rápido
    const empresasEncontradas = await empresaDataLakeModel.find(mongoQuery).limit(30).exec();
    
    if (empresasEncontradas.length === 0) {
      this.logger.warn(`Nenhum fornecedor encontrado no Data Lake para ${query} em ${ufAlvo}.`);
      return [];
    }

    this.logger.log(`Encontradas ${empresasEncontradas.length} empresas no banco local! Processando...`);

    const fornecedoresRelevantes = [];

    // 2. TRANSFERIR DO DATA LAKE PARA FORNECEDOR OFICIAL
    for (const empresa of empresasEncontradas) {
      // Filtrar apenas se for Distribuidor/Atacadista/Industria (se cnae_descricao existir)
      if (empresa.cnae_descricao && !regexNicho.test(empresa.cnae_descricao) && !regexNicho.test(empresa.razao_social || '')) {
        // continue; // Opcional: restringe estritamente o nicho
      }

      let fornecedor = await this.fornecedorModel.findOne({ cnpj: empresa.cnpj }).exec();
      
      const razaoOuFantasia = empresa.razao_social || `Empresa ${empresa.cnpj}`;
      const telefoneFmt = empresa.telefone ? `(${empresa.telefone.substring(0,2)}) ${empresa.telefone.substring(2,6)}-${empresa.telefone.substring(6)}` : '(00) 00000-0000';

      if (!fornecedor) {
        fornecedor = await this.fornecedorModel.create({
          razaoSocial: razaoOuFantasia,
          cnpj: empresa.cnpj,
          cep: empresa.cep || '',
          origem: 'bot',
          telefone: telefoneFmt,
          email: empresa.email || 'Nao informado',
          site: '',
          portifolio: '',
          endereco: `${empresa.logradouro || ''}, ${empresa.numero || ''}`,
          bairro: empresa.bairro || '',
          cidade: empresa.municipio || ufAlvo, // TODO: Mapear código IBGE/RFB para nome
          uf: empresa.uf,
          categorias: [empresa.cnae_descricao || empresa.cnae_principal]
        });
        this.logger.log(`✅ Novo Fornecedor (via Data Lake) cadastrado: ${fornecedor.razaoSocial}`);
      }

      // Mock de preço unitário para a cotação
      const precoUnit = (query.length * 1.5) + (Math.random() * 5); 

      fornecedoresRelevantes.push({
        razaoSocial: fornecedor.razaoSocial,
        id: fornecedor._id.toString(),
        precoUnitario: precoUnit,
        linkProduto: `https://cnpj.biz/${empresa.cnpj.replace(/\\D/g, '')}`
      });
    }

    return fornecedoresRelevantes;
  }
}
