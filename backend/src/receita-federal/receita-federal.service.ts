import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmpresaDataLake,
  EmpresaDataLakeDocument,
} from './receita-federal.schema';
import * as https from 'https';
import * as unzipper from 'unzipper';
import { parse } from 'csv-parse';
import * as iconv from 'iconv-lite';
import { retryWithBackoff } from './utils/retry-with-backoff';

@Injectable()
export class ReceitaFederalService {
  private readonly logger = new Logger(ReceitaFederalService.name);

  constructor(
    @InjectModel(EmpresaDataLake.name)
    private readonly empresaDataLakeModel: Model<EmpresaDataLakeDocument>,
  ) {}

  async runETLPipeline() {
    this.logger.log('--- INICIANDO PIPELINE DE ETL DO DATA LAKE ---');
    const ufAlvo = 'CE'; // Estado alvo
    const statusAlvo = '02'; // '02' = ATIVA

    // 1. Dicionários em Memória (Tabelas Pequenas)
    const mapMunicipios = await this.loadDicionario(
      'https://dadosabertos.rfb.gov.br/CNPJ/Municipios.zip',
      'Municipios',
    );
    const mapCnaes = await this.loadDicionario(
      'https://dadosabertos.rfb.gov.br/CNPJ/Cnaes.zip',
      'Cnaes',
    );

    // 2. Extração de Estabelecimentos (A Base de Tudo)
    this.logger.log('--- FASE 1: EXTRAINDO ESTABELECIMENTOS ---');
    // Para um MVP rápido de teste, processamos apenas o pacote 0. Na produção real, iterar de 0 a 9.
    const pacotes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const i of pacotes) {
      // Processando de 0 a 9 em produção
      await this.processEstabelecimentos(
        `https://dadosabertos.rfb.gov.br/CNPJ/Estabelecimentos${i}.zip`,
        ufAlvo,
        statusAlvo,
        mapMunicipios,
        mapCnaes,
      );
    }

    // 3. Carregar CNPJs Básicos válidos para a memória
    this.logger.log('--- FASE 2: PREPARANDO JOIN DE EMPRESAS ---');
    const cnpjBasicosValidos = await this.empresaDataLakeModel
      .distinct('cnpj_basico', { uf: ufAlvo })
      .exec();
    const setCnpjBasicos = new Set(cnpjBasicosValidos);
    this.logger.log(
      `${setCnpjBasicos.size} CNPJs Básicos do Estado ${ufAlvo} carregados na memória.`,
    );

    // 4. Extração de Empresas (Apenas atualizando os CNPJs que sobrevivem)
    this.logger.log('--- FASE 3: EXTRAINDO RAZÃO SOCIAL (EMPRESAS) ---');
    for (const i of pacotes) {
      // Atualizando todas as empresas válidas
      await this.processEmpresas(
        `https://dadosabertos.rfb.gov.br/CNPJ/Empresas${i}.zip`,
        setCnpjBasicos,
      );
    }

    this.logger.log('--- PIPELINE CONCLUÍDO COM SUCESSO! ---');
  }

  private async loadDicionario(
    url: string,
    nome: string,
  ): Promise<Map<string, string>> {
    this.logger.log(`Carregando dicionário na memória: ${nome}...`);
    const map = new Map<string, string>();
    return retryWithBackoff(
      () =>
        new Promise((resolve, reject) => {
          const req = https.get(url, (res) => {
            if (res.statusCode !== 200)
              return reject(new Error(`Falha no download de ${nome} (Status ${res.statusCode})`));
            const unzip = res.pipe(unzipper.Parse());
            unzip.on('entry', async (entry) => {
              const csvParser = entry
                .pipe(iconv.decodeStream('win1252'))
                .pipe(parse({ delimiter: ';', relax_quotes: true, quote: '"' }));
              for await (const row of csvParser) {
                map.set(String(row[0]).trim(), String(row[1]).trim());
              }
              entry.autodrain();
            });
            unzip.on('close', () => {
              this.logger.log(
                `Dicionário ${nome} carregado: ${map.size} registros.`,
              );
              resolve(map);
            });
            unzip.on('error', (err) => reject(err));
          });
          req.on('error', (err) => reject(err));
        }),
      {
        maxRetries: 5,
        baseDelayMs: 3000,
        onRetry: (attempt, err) =>
          this.logger.warn(`Tentativa ${attempt} falhou para ${nome} (${err.message}), tentando de novo...`),
      },
    );
  }

  private async processEstabelecimentos(
    url: string,
    targetUf: string,
    targetStatus: string,
    mapMunicipios: Map<string, string>,
    mapCnaes: Map<string, string>,
  ) {
    this.logger.log(`Baixando Estabelecimentos: ${url}`);
    return retryWithBackoff(
      () =>
        new Promise((resolve, reject) => {
          const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
              if (res.statusCode === 404) return resolve(false);
              return reject(new Error(`Falha no download de ${url} (Status ${res.statusCode})`));
            }
            const unzip = res.pipe(unzipper.Parse());

            unzip.on('entry', async (entry) => {
            const csvParser = entry
              .pipe(iconv.decodeStream('win1252'))
              .pipe(parse({ delimiter: ';', relax_quotes: true, quote: '"' }));
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
                const telefone =
                  row[21] && row[22]
                    ? `${row[21]}${row[22]}`.trim()
                    : undefined;

                bulkOps.push({
                  updateOne: {
                    filter: { cnpj: cnpjCompleto },
                    update: {
                      $set: {
                        cnpj: cnpjCompleto,
                        cnpj_basico: cnpjBase,
                        cnae_principal: cnae,
                        situacao_cadastral: situacao,
                        uf: uf,
                        cep: String(row[18]).trim(),
                        telefone: telefone,
                        email: String(row[27]).trim().toLowerCase(),
                        logradouro: String(row[14]).trim(),
                        numero: String(row[15]).trim(),
                        bairro: String(row[17]).trim(),
                        municipio: mapMunicipios.get(muniCod) || muniCod,
                        cnae_descricao: mapCnaes.get(cnae) || 'Não informada',
                      },
                    },
                    upsert: true,
                  },
                });

                if (bulkOps.length >= 1000) {
                  csvParser.pause();
                  try {
                    await this.empresaDataLakeModel.bulkWrite(bulkOps, {
                      ordered: false,
                    });
                    bulkOps = [];
                  } catch (err) {
                  } finally {
                    csvParser.resume();
                  }
                }
              }
            }
            if (bulkOps.length > 0)
              await this.empresaDataLakeModel.bulkWrite(bulkOps, {
                ordered: false,
              });
            entry.autodrain();
          });
          unzip.on('close', () => resolve(true));
          unzip.on('error', (err) => reject(err));
        });
        req.on('error', (err) => reject(err));
      }),
      {
        maxRetries: 5,
        baseDelayMs: 3000,
        onRetry: (attempt, err) =>
          this.logger.warn(`Tentativa ${attempt} falhou para Estabelecimentos (${err.message}), tentando de novo...`),
      },
    );
  }

  private async processEmpresas(url: string, setCnpjBasicos: Set<string>) {
    this.logger.log(`Baixando Empresas: ${url}`);
    return retryWithBackoff(
      () =>
        new Promise((resolve, reject) => {
          const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
              if (res.statusCode === 404) return resolve(false);
              return reject(new Error(`Falha no download de ${url} (Status ${res.statusCode})`));
            }
            const unzip = res.pipe(unzipper.Parse());

            unzip.on('entry', async (entry) => {
            const csvParser = entry
              .pipe(iconv.decodeStream('win1252'))
              .pipe(parse({ delimiter: ';', relax_quotes: true, quote: '"' }));
            let bulkOps = [];

            for await (const row of csvParser) {
              const cnpjBase = String(row[0]).padStart(8, '0');

              if (setCnpjBasicos.has(cnpjBase)) {
                bulkOps.push({
                  updateMany: {
                    // Atualiza todas as filiais que tiverem esse cnpj básico
                    filter: { cnpj_basico: cnpjBase },
                    update: {
                      $set: {
                        razao_social: String(row[1]).trim(),
                        capital_social:
                          Number(String(row[4]).replace(',', '.')) || 0,
                      },
                    },
                  },
                });

                if (bulkOps.length >= 1000) {
                  csvParser.pause();
                  try {
                    await this.empresaDataLakeModel.bulkWrite(bulkOps, {
                      ordered: false,
                    });
                    bulkOps = [];
                  } catch (err) {
                  } finally {
                    csvParser.resume();
                  }
                }
              }
            }
            if (bulkOps.length > 0)
              await this.empresaDataLakeModel.bulkWrite(bulkOps, {
                ordered: false,
              });
            entry.autodrain();
          });
          unzip.on('close', () => resolve(true));
          unzip.on('error', (err) => reject(err));
        });
        req.on('error', (err) => reject(err));
      }),
      {
        maxRetries: 5,
        baseDelayMs: 3000,
        onRetry: (attempt, err) =>
          this.logger.warn(`Tentativa ${attempt} falhou para Empresas (${err.message}), tentando de novo...`),
      },
    );
  }
}
