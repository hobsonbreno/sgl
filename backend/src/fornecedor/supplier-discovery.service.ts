import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Fornecedor,
  FornecedorDocument,
  ProdutoBase,
  ProdutoBaseDocument,
} from './fornecedor.schema';
import {
  PerfilBusca,
  PerfilBuscaDocument,
} from '../perfil-busca/perfil-busca.schema';
import { ProductMatchingService } from './product-matching.service';
import { CnpjEnrichmentService } from './cnpj-enrichment.service';

@Injectable()
export class SupplierDiscoveryService {
  private readonly logger = new Logger(SupplierDiscoveryService.name);

  constructor(
    @InjectModel(Fornecedor.name)
    private fornecedorModel: Model<FornecedorDocument>,
    @InjectModel(ProdutoBase.name)
    private produtoBaseModel: Model<ProdutoBaseDocument>,
    @InjectModel(PerfilBusca.name)
    private perfilBuscaModel: Model<PerfilBuscaDocument>,
    private productMatchingService: ProductMatchingService,
    private cnpjEnrichmentService: CnpjEnrichmentService,
  ) {}

  private normalizeStr(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private sanitizeQuery(descricao: string): string {
    let q = descricao.toUpperCase();
    const junk = [
      'DADOS DE IDENTIFICACAO',
      'MARCA DO FABRICANTE',
      'PRAZO DE VALIDADE',
      'PESO LIQUIDO',
      'DATA DE FABRICACAO',
      'NUMERO DO LOTE',
      'INFORMACAO NUTRICIONAL',
      'RESOLUCAO',
      'CNNPA',
      'REGISTRO NO MINISTERIO DA SAUDE',
      'PORTARIA',
      'ABIC',
      'MARCAS E CARIMBOS OFICIAIS',
      'REGISTRO SIF',
      'SIE',
      'SIM',
      'CERTIFICADO DA VIGILANCIA SANITARIA',
      'PROCEDENCIA',
      'ACONDICIONADOS EM CAIXAS',
      'ACONDICIONADA EM CAIXAS',
      'ACONDICIONADO EM PLASTICO',
      'EMBALAGEM',
      'EMBALADO',
      'EMBALADOS',
    ];
    let cutoff = q.length;
    junk.forEach((j) => {
      const idx = q.indexOf(j);
      if (idx !== -1 && idx < cutoff) cutoff = idx;
    });

    q = q
      .substring(0, cutoff)
      .replace(/[^\w\sÀ-ÿ]/g, '')
      .trim();
    const parts = q.split(' ').filter((p) => p.length > 2);
    // Extrai as 2 primeiras palavras chave
    let clean = parts.slice(0, 2).join(' ');
    if (!clean) clean = descricao.split(' ')[0];
    return clean;
  }

  private getSerpApiKeys(): string[] {
    const keys = process.env.SERPAPI_KEYS || '';
    return keys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  async discoverSuppliersForProduct(
    descricao: string,
    location?: string,
  ): Promise<
    {
      razaoSocial: string;
      precoUnitario: number;
      linkProduto: string;
      id: string;
    }[]
  > {
    const query = this.sanitizeQuery(descricao);
    this.logger.log(
      `Iniciando Descoberta B2B para: ${query} | Location: ${location}`,
    );

    // 1. CARREGAR PERFIL DE BUSCA
    const ativo = await this.perfilBuscaModel.findOne({ ativo: true }).exec();
    const ufsPermitidas =
      ativo?.estadosBuscaFornecedores?.map((u) => this.normalizeStr(u)) || [];
    const municipiosPermitidos =
      ativo?.municipiosBuscaFornecedores?.map((m) => this.normalizeStr(m)) ||
      [];

    const ufAlvo = ufsPermitidas.length > 0 ? ufsPermitidas[0] : 'CE';
    const minicipioAlvo =
      municipiosPermitidos.length > 0 && municipiosPermitidos[0] !== ''
        ? municipiosPermitidos[0]
        : '';

    let isManualOverride = false;
    let manualQuery = '';

    if (location && location.toUpperCase().startsWith('BUSCAR:')) {
      isManualOverride = true;
      manualQuery = location.replace(/BUSCAR:/i, '').trim();
      this.logger.log(
        `Modo Manual (Override) ativado. Buscando empresa: ${manualQuery}`,
      );
    }

    const fornecedoresRelevantes = [];
    const regexNicho =
      /ATACADISTA|DISTRIBUIDORA|DISTRIBUIDOR|INDÚSTRIA|INDUSTRIA|FÁBRICA|FABRICA|PRODUTOR/i;

    try {
      // Tenta buscar no Data Lake Local Primeiro
      this.logger.log(`Consultando Data Lake Local...`);
      const empresaDataLakeModel =
        this.fornecedorModel.db.model('EmpresaDataLake');

      const mongoQuery: any = { situacao_cadastral: '02', uf: ufAlvo };

      // Não aplicamos filtro de string direto na query se não for manual, pois queremos usar o ProductMatchingService
      if (isManualOverride) {
        const regexManual = new RegExp(manualQuery, 'i');
        mongoQuery.$or = [
          { razao_social: regexManual },
          { nome_fantasia: regexManual },
        ];
      }

      // Removemos o limit(30) e usamos cursor para não estourar a memória
      const cursor = empresaDataLakeModel.find(mongoQuery).cursor();

      let processadas = 0;
      let passaramSegmento = 0;
      let passaramProduto = 0;
      const MAX_RESULTS = process.env.MAX_SUPPLIERS_PER_SEARCH
        ? parseInt(process.env.MAX_SUPPLIERS_PER_SEARCH)
        : 30;

      for await (const empresa of cursor) {
        processadas++;

        if (!isManualOverride) {
          // Filtro 1: Nicho / Segmento
          const isSegmentoValido =
            (empresa.cnae_descricao &&
              regexNicho.test(empresa.cnae_descricao)) ||
            regexNicho.test(empresa.razao_social || '');
          if (!isSegmentoValido) continue;
          passaramSegmento++;

          // Filtro 2: Produto (Inteligente)
          const isProdutoValido =
            await this.productMatchingService.doesCompanySellProduct(
              query,
              empresa,
            );
          if (!isProdutoValido) continue;
          passaramProduto++;
        }

        let fornecedor = await this.fornecedorModel
          .findOne({ cnpj: empresa.cnpj })
          .exec();

        if (!fornecedor) {
          const enriched = await this.cnpjEnrichmentService.enrichCnpj(
            empresa.cnpj,
          );
          const razaoOuFantasia =
            enriched?.razao_social ||
            enriched?.nome_fantasia ||
            empresa.razao_social ||
            `Empresa ${empresa.cnpj}`;
          let telefoneFmt =
            enriched?.ddd_telefone_1 || enriched?.ddd_telefone_2;
          if (!telefoneFmt && empresa.telefone)
            telefoneFmt = `(${empresa.telefone.substring(0, 2)}) ${empresa.telefone.substring(2, 6)}-${empresa.telefone.substring(6)}`;
          if (!telefoneFmt) telefoneFmt = '(00) 00000-0000';

          fornecedor = await this.fornecedorModel.create({
            razaoSocial: razaoOuFantasia,
            cnpj: empresa.cnpj,
            cep: enriched?.cep || empresa.cep || '',
            origem: 'bot',
            telefone: telefoneFmt,
            email: enriched?.email || empresa.email || 'Nao informado',
            site: '',
            portifolio: '',
            endereco: enriched?.logradouro
              ? `${enriched.logradouro}, ${enriched.numero || 'SN'}`
              : `${empresa.logradouro || ''}, ${empresa.numero || ''}`,
            bairro: enriched?.bairro || empresa.bairro || '',
            cidade: enriched?.municipio || empresa.municipio || ufAlvo,
            uf: enriched?.uf || empresa.uf || ufAlvo,
            categorias: enriched?.cnae_fiscal_descricao
              ? [enriched.cnae_fiscal_descricao]
              : [empresa.cnae_descricao || empresa.cnae_principal],
          });
          this.logger.log(
            `✅ Novo Fornecedor (via Data Lake) cadastrado: ${fornecedor.razaoSocial}`,
          );
        }

        const precoUnit = 0;
        fornecedoresRelevantes.push({
          razaoSocial: fornecedor.razaoSocial,
          id: fornecedor._id.toString(),
          precoUnitario: precoUnit,
          linkProduto: `https://cnpj.biz/${empresa.cnpj.replace(/\D/g, '')}`,
        });

        if (fornecedoresRelevantes.length >= MAX_RESULTS) {
          this.logger.log(
            `Limite de ${MAX_RESULTS} fornecedores atingido. Parando busca.`,
          );
          break;
        }
      }

      this.logger.log(
        `Resumo Data Lake: ${processadas} processadas -> ${passaramSegmento} passaram no Segmento -> ${passaramProduto} venderam o Produto.`,
      );
    } catch (err) {
      this.logger.warn(`Erro ao consultar Data Lake: ${err.message}`);
    }

    // SE AINDA NÃO ACHOU, BUSCAR NA SERPAPI!
    if (fornecedoresRelevantes.length === 0) {
      this.logger.log(
        `Data Lake vazio ou sem matches. Recorrendo à SerpApi...`,
      );
      const keys = this.getSerpApiKeys();
      if (keys.length > 0) {
        const apiKey = keys[Math.floor(Math.random() * keys.length)];
        const searchQueriesToTry = [];
        if (isManualOverride) {
          searchQueriesToTry.push(
            `site:cnpj.biz OR site:casadosdados.com.br "${manualQuery}" ${ufAlvo} ${minicipioAlvo}`.trim(),
          );
          if (minicipioAlvo)
            searchQueriesToTry.push(
              `site:cnpj.biz OR site:casadosdados.com.br "${manualQuery}" ${ufAlvo}`.trim(),
            );
        } else {
          searchQueriesToTry.push(
            `site:cnpj.biz OR site:casadosdados.com.br ("atacadista" OR "distribuidor" OR "industria" OR "produtor" OR "fabrica") "${query}" ${ufAlvo} ${minicipioAlvo}`.trim(),
          );
          if (minicipioAlvo)
            searchQueriesToTry.push(
              `site:cnpj.biz OR site:casadosdados.com.br ("atacadista" OR "distribuidor" OR "industria" OR "produtor" OR "fabrica") "${query}" ${ufAlvo}`.trim(),
            );
        }

        try {
          const axios = require('axios');
          let results = [];
          for (const searchQuery of searchQueriesToTry) {
            this.logger.log(`SerpApi searchQuery: ${searchQuery}`);
            const response = await axios.get('https://serpapi.com/search', {
              params: {
                q: searchQuery,
                engine: 'google',
                api_key: apiKey,
                num: 10,
                hl: 'pt',
                gl: 'br',
              },
            });
            results = response.data.organic_results || [];
            if (results.length > 0) {
              break; // Se encontrou, para de alargar a busca
            }
          }
          this.logger.log(
            `SerpApi encontrou ${results.length} resultados orgânicos.`,
          );

          for (const res of results) {
            const snippet = (res.snippet || '') + ' ' + (res.title || '');
            // Extrai CNPJ formatado ou apenas digitos
            const cnpjMatch = snippet.match(
              /\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/,
            );
            const linkCnpjMatch = res.link ? res.link.match(/\d{14}/) : null;
            const telefoneMatch = snippet.match(
              /\(?\d{2}\)?\s?(?:9\d{4}|\d{4})\-\d{4}/,
            );

            let cnpjStr = '';
            if (cnpjMatch) {
              cnpjStr = cnpjMatch[0];
            } else if (linkCnpjMatch) {
              const raw = linkCnpjMatch[0];
              cnpjStr = `${raw.substring(0, 2)}.${raw.substring(2, 5)}.${raw.substring(5, 8)}/${raw.substring(8, 12)}-${raw.substring(12, 14)}`;
            }

            if (cnpjStr) {
              let fornecedor = await this.fornecedorModel
                .findOne({ cnpj: cnpjStr })
                .exec();
              if (!fornecedor) {
                const enriched =
                  await this.cnpjEnrichmentService.enrichCnpj(cnpjStr);

                let razaoOuFantasia =
                  enriched?.razao_social ||
                  enriched?.nome_fantasia ||
                  res.title
                    .split('-')[0]
                    .replace(/CNPJ|Biz|Casa dos Dados/gi, '')
                    .trim();
                if (razaoOuFantasia.length < 3)
                  razaoOuFantasia = `Empresa ${cnpjStr}`;

                let telefoneFmt =
                  enriched?.ddd_telefone_1 || enriched?.ddd_telefone_2;
                if (!telefoneFmt && telefoneMatch)
                  telefoneFmt = telefoneMatch[0];
                if (!telefoneFmt) telefoneFmt = '(00) 00000-0000';

                fornecedor = await this.fornecedorModel.create({
                  razaoSocial: razaoOuFantasia,
                  cnpj: cnpjStr,
                  cep: enriched?.cep || '',
                  origem: 'bot',
                  telefone: telefoneFmt,
                  email: enriched?.email || 'Nao informado',
                  site: res.link || '',
                  portifolio: '',
                  endereco: enriched?.logradouro
                    ? `${enriched.logradouro}, ${enriched.numero || 'SN'}`
                    : '',
                  bairro: enriched?.bairro || '',
                  cidade: enriched?.municipio || minicipioAlvo || ufAlvo,
                  uf: enriched?.uf || ufAlvo,
                  categorias: enriched?.cnae_fiscal_descricao
                    ? [enriched.cnae_fiscal_descricao]
                    : [query],
                });
                this.logger.log(
                  `✅ Novo Fornecedor (via SerpApi) cadastrado: ${fornecedor.razaoSocial}`,
                );
              }

              const precoUnit = 0;
              fornecedoresRelevantes.push({
                razaoSocial: fornecedor.razaoSocial,
                id: fornecedor._id.toString(),
                precoUnitario: precoUnit,
                linkProduto: res.link,
              });
            }
          }
        } catch (err) {
          this.logger.error(`Erro na requisição SerpApi: ${err.message}`);
        }
      } else {
        this.logger.warn(
          'Nenhuma chave SerpApi configurada nas variáveis de ambiente.',
        );
      }
    }

    return fornecedoresRelevantes;
  }
}
