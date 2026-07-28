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
    this.logger.log(`Iniciando Descoberta B2B para: ${query} | Location: ${location}`);

    // 1. CARREGAR PERFIL DE BUSCA
    const ativo = await this.perfilBuscaModel.findOne({ ativo: true }).exec();
    const ufsPermitidas = ativo?.estadosBuscaFornecedores?.map(u => this.normalizeStr(u)) || [];
    const municipiosPermitidos = ativo?.municipiosBuscaFornecedores?.map(m => this.normalizeStr(m)) || [];

    const ufAlvo = ufsPermitidas.length > 0 ? ufsPermitidas[0] : 'CE';
    const minicipioAlvo = municipiosPermitidos.length > 0 && municipiosPermitidos[0] !== '' ? municipiosPermitidos[0] : '';
    
    let isManualOverride = false;
    let manualQuery = '';
    
    if (location && location.toUpperCase().startsWith('BUSCAR:')) {
      isManualOverride = true;
      manualQuery = location.replace(/BUSCAR:/i, '').trim();
      this.logger.log(`Modo Manual (Override) ativado. Buscando empresa: ${manualQuery}`);
    }

    const fornecedoresRelevantes = [];
    const regexNicho = /ATACADISTA|DISTRIBUIDORA|INDÚSTRIA|INDUSTRIA|FÁBRICA|FABRICA/i;

    try {
      // Tenta buscar no Data Lake Local Primeiro
      this.logger.log(`Consultando Data Lake Local...`);
      const empresaDataLakeModel = this.fornecedorModel.db.model('EmpresaDataLake');
      
      const mongoQuery: any = { situacao_cadastral: '02', uf: ufAlvo };
      
      if (isManualOverride) {
        const regexManual = new RegExp(manualQuery, 'i');
        mongoQuery.$or = [
          { razao_social: regexManual },
          { nome_fantasia: regexManual }
        ];
      } else {
        const regexQuery = new RegExp(query, 'i');
        mongoQuery.$or = [
          { razao_social: regexQuery },
          { cnae_descricao: regexQuery }
        ];
      }

      const empresasEncontradas = await empresaDataLakeModel.find(mongoQuery).limit(30).exec();
      
      if (empresasEncontradas.length > 0) {
        this.logger.log(`Encontradas ${empresasEncontradas.length} empresas no banco local! Processando...`);
        for (const empresa of empresasEncontradas) {
          if (!isManualOverride && empresa.cnae_descricao && !regexNicho.test(empresa.cnae_descricao) && !regexNicho.test(empresa.razao_social || '')) {
            // Pode ignorar nichos muito diferentes, mas vamos aceitar se for uma busca direta
            continue;
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
              cidade: empresa.municipio || ufAlvo,
              uf: empresa.uf || ufAlvo,
              categorias: [empresa.cnae_descricao || empresa.cnae_principal]
            });
            this.logger.log(`✅ Novo Fornecedor (via Data Lake) cadastrado: ${fornecedor.razaoSocial}`);
          }

          const precoUnit = (query.length * 1.5) + (Math.random() * 5); 
          fornecedoresRelevantes.push({
            razaoSocial: fornecedor.razaoSocial,
            id: fornecedor._id.toString(),
            precoUnitario: precoUnit,
            linkProduto: `https://cnpj.biz/${empresa.cnpj.replace(/\\D/g, '')}`
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Erro ao consultar Data Lake: ${err.message}`);
    }

    // SE AINDA NÃO ACHOU, BUSCAR NA SERPAPI!
    if (fornecedoresRelevantes.length === 0) {
      this.logger.log(`Data Lake vazio ou sem matches. Recorrendo à SerpApi...`);
      const keys = this.getSerpApiKeys();
      if (keys.length > 0) {
        const apiKey = keys[Math.floor(Math.random() * keys.length)];
        let searchQuery = '';
        if (isManualOverride) {
           searchQuery = `site:cnpj.biz OR site:casadosdados.com.br "${manualQuery}" ${ufAlvo} ${minicipioAlvo}`;
        } else {
           searchQuery = `site:cnpj.biz OR site:casadosdados.com.br ("atacadista" OR "distribuidor" OR "industria") "${query}" ${ufAlvo} ${minicipioAlvo}`;
        }
        
        try {
          const axios = require('axios');
          const response = await axios.get('https://serpapi.com/search', {
            params: {
              q: searchQuery,
              engine: 'google',
              api_key: apiKey,
              num: 10,
              hl: 'pt',
              gl: 'br'
            }
          });

          const results = response.data.organic_results || [];
          this.logger.log(`SerpApi encontrou ${results.length} resultados orgânicos.`);

          for (const res of results) {
            const snippet = (res.snippet || '') + ' ' + (res.title || '');
            // Extrai CNPJ formatado ou apenas digitos
            const cnpjMatch = snippet.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/);
            const linkCnpjMatch = res.link ? res.link.match(/\d{14}/) : null;
            const telefoneMatch = snippet.match(/\(?\d{2}\)?\s?(?:9\d{4}|\d{4})\-\d{4}/);
            
            let cnpjStr = '';
            if (cnpjMatch) {
              cnpjStr = cnpjMatch[0];
            } else if (linkCnpjMatch) {
              const raw = linkCnpjMatch[0];
              cnpjStr = `${raw.substring(0,2)}.${raw.substring(2,5)}.${raw.substring(5,8)}/${raw.substring(8,12)}-${raw.substring(12,14)}`;
            }

            if (cnpjStr) {
              const telefoneFmt = telefoneMatch ? telefoneMatch[0] : '(00) 00000-0000';
              // Tenta limpar o nome da empresa
              let razaoOuFantasia = res.title.split('-')[0].replace(/CNPJ|Biz|Casa dos Dados/gi, '').trim();
              if (razaoOuFantasia.length < 3) razaoOuFantasia = `Empresa ${cnpjStr}`;
              
              let fornecedor = await this.fornecedorModel.findOne({ cnpj: cnpjStr }).exec();
              if (!fornecedor) {
                fornecedor = await this.fornecedorModel.create({
                  razaoSocial: razaoOuFantasia,
                  cnpj: cnpjStr,
                  cep: '',
                  origem: 'bot',
                  telefone: telefoneFmt,
                  email: 'Nao informado',
                  site: res.link || '',
                  portifolio: '',
                  endereco: '',
                  bairro: '',
                  cidade: minicipioAlvo || ufAlvo,
                  uf: ufAlvo,
                  categorias: [query]
                });
                this.logger.log(`✅ Novo Fornecedor (via SerpApi) cadastrado: ${fornecedor.razaoSocial}`);
              }

              const precoUnit = (query.length * 1.5) + (Math.random() * 5); 
              fornecedoresRelevantes.push({
                razaoSocial: fornecedor.razaoSocial,
                id: fornecedor._id.toString(),
                precoUnitario: precoUnit,
                linkProduto: res.link
              });
            }
          }
        } catch (err) {
          this.logger.error(`Erro na requisição SerpApi: ${err.message}`);
        }
      } else {
        this.logger.warn('Nenhuma chave SerpApi configurada nas variáveis de ambiente.');
      }
    }

    return fornecedoresRelevantes;
  }
}
