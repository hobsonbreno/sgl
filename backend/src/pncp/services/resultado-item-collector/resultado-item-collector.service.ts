import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PncpClientService } from '../pncp-client/pncp-client.service';
import { ResultadoItem, ResultadoItemDocument } from '../../schemas/resultado-item.schema';
import { Oportunidade, OportunidadeDocument } from '../../../oportunidade/oportunidade.schema';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timer, catchError, retry } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ResultadoItemCollectorService {
  private readonly logger = new Logger(ResultadoItemCollectorService.name);

  constructor(
    private readonly pncpClient: PncpClientService,
    private readonly httpService: HttpService,
    @InjectModel(ResultadoItem.name)
    private readonly resultadoItemModel: Model<ResultadoItemDocument>,
    @InjectModel(Oportunidade.name)
    private readonly oportunidadeModel: Model<OportunidadeDocument>,
  ) {}

  // Roda de madrugada
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async collectResultadosHomologados() {
    this.logger.log('Iniciando job de coleta OTIMIZADA de resultados homologados...');
    
    // Busca atualizações dos últimos 3 dias
    const hoje = new Date();
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(hoje.getDate() - 3);

    const formatData = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
    const dataFinal = formatData(hoje);
    const dataInicial = formatData(tresDiasAtras);

    let pagina = 1;
    let totalPaginas = 1;
    let limitReached = false;

    while (pagina <= totalPaginas && !limitReached) {
      try {
        const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao?dataInicial=${dataInicial}&dataFinal=${dataFinal}&pagina=${pagina}`;
        const res = await this.fazerRequisicaoComRetry(url);
        
        if (!res || !res.data || res.data.length === 0) break;
        totalPaginas = res.totalPaginas || 1;

        for (const compra of res.data) {
          try {
            // Filtro client-side: Só processa se tiver valorTotalHomologado
            if (compra.valorTotalHomologado === null && compra.situacaoCompraId !== 4) {
              continue;
            }

            if (!compra.numeroControlePNCP) continue;
            
            const partes = compra.numeroControlePNCP.split('/');
            if (partes.length < 2) continue;
            
            const [cnpjSeq, ano] = partes;
            const subPartes = cnpjSeq.split('-');
            if (subPartes.length < 3) continue;
            
            const cnpj = subPartes[0];
            const seq = subPartes[2];

            // Verifica se já processou esta compra recentemente (opcional, mas bom pra evitar repetição no mesmo lote)
            const itensUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens`;
            const itensResponse = await this.fazerRequisicaoComRetry(itensUrl, true);
            const itens = itensResponse || [];

            for (const item of itens) {
              const resUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens/${item.numeroItem}/resultados`;
              const resultados = await this.fazerRequisicaoComRetry(resUrl, true);
              
              if (resultados && Array.isArray(resultados) && resultados.length > 0) {
                for (const res of resultados) {
                  if (res.valorUnitarioHomologado) {
                    let keyword = 'Produto';
                    const desc = item.descricao || 'Produto';
                    let extracted = desc.split(/[,.]/)[0].trim();
                    extracted = extracted.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '').trim();
                    const words = extracted.split(/[ -]+/);
                    
                    if (words.length > 0 && words[0].length >= 3) {
                      keyword = words[0];
                    } else if (words.length > 1 && words[1].length >= 3) {
                      keyword = words.slice(0, 2).join(' ');
                    } else if (extracted.length >= 3) {
                      keyword = extracted;
                    }

                    const ufFornecedor = compra.unidadeOrgao?.ufSigla || 'BR';

                    await this.resultadoItemModel.findOneAndUpdate(
                      { 
                        numeroControlePNCP: compra.numeroControlePNCP, 
                        numeroItem: item.numeroItem 
                      },
                      {
                        numeroControlePNCP: compra.numeroControlePNCP,
                        numeroItem: item.numeroItem,
                        descricaoItem: item.descricao,
                        palavraChaveExtraida: keyword,
                        niFornecedor: res.niFornecedor,
                        nomeRazaoSocialFornecedor: res.nomeRazaoSocialFornecedor,
                        valorUnitarioHomologado: res.valorUnitarioHomologado,
                        valorTotalHomologado: res.valorTotalHomologado,
                        quantidadeHomologada: res.quantidadeHomologada,
                        dataResultado: res.dataResultado ? new Date(res.dataResultado) : new Date(),
                        uf: ufFornecedor,
                      },
                      { upsert: true, new: true }
                    );
                  }
                }
              }
              // Rate limit entre itens/resultados
              await new Promise(r => setTimeout(r, 250));
            }
          } catch (itemErr) {
            this.logger.warn(`Falha ao processar compra ${compra.numeroControlePNCP}: ${itemErr.message}`);
            continue; // Segue pra próxima compra
          }
        }

        pagina++;
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        this.logger.error(`Erro na página ${pagina}: ${e.message}`);
        break;
      }
    }
    this.logger.log('Job de resultados finalizado.');
  }

  private async fazerRequisicaoComRetry(url: string, tolerate204 = false): Promise<any> {
    return firstValueFrom(
      this.httpService.get(url, { timeout: 30000 }).pipe(
        retry({
          count: 3,
          delay: (error: AxiosError, retryCount: number) => {
            if (tolerate204 && (error.response?.status === 204 || error.response?.status === 404)) {
              throw error; // Não retenta se for 204 ou 404
            }
            this.logger.warn(`Falha na requisição para ${url}. Tentativa ${retryCount}/3. Erro: ${error.message}`);
            return timer(5000 * retryCount);
          },
        }),
        catchError((error: AxiosError) => {
          if (tolerate204 && (error.response?.status === 204 || error.response?.status === 404)) {
            return [null] as any; // Resolve como null sem jogar erro
          }
          throw error;
        }),
      ),
    ).then(res => (res as any)?.data || res);
  }
}
