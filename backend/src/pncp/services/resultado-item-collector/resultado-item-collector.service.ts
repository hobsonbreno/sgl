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
    this.logger.log('Iniciando job de coleta de resultados homologados...');
    
    // Filtra oportunidades que já encerraram a proposta há mais de 2 dias e ainda não tem resultado verificado
    const doisDiasAtras = new Date();
    doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);

    const oportunidades = await this.oportunidadeModel.find({
      dataEncerramentoProposta: { $lte: doisDiasAtras },
      resultadoVerificado: { $ne: true }, // Assumindo a adição desse campo no schema (ou verificando os itens diretamente)
    }).limit(100).exec(); // Processa em lotes para não estourar

    this.logger.log(`Encontradas ${oportunidades.length} oportunidades para verificar resultados.`);

    for (const op of oportunidades) {
      if (!op.numeroControlePNCP) continue;
      
      const partes = op.numeroControlePNCP.split('/');
      if (partes.length < 2) continue;
      
      const [cnpjSeq, ano] = partes;
      const subPartes = cnpjSeq.split('-');
      if (subPartes.length < 3) continue;
      
      const cnpj = subPartes[0];
      const seq = subPartes[2];

      try {
        // Busca itens da compra
        const itensUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens`;
        const itensResponse = await this.fazerRequisicaoComRetry(itensUrl);
        const itens = itensResponse || [];

        let encontrouResultado = false;

        for (const item of itens) {
          const resUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens/${item.numeroItem}/resultados`;
          const resultados = await this.fazerRequisicaoComRetry(resUrl, true); // true para tolerar 204
          
          if (resultados && Array.isArray(resultados) && resultados.length > 0) {
            encontrouResultado = true;
            for (const res of resultados) {
              if (res.valorUnitarioHomologado) {
                // Extrai palavra-chave da mesma forma que o frontend
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

                await this.resultadoItemModel.findOneAndUpdate(
                  { 
                    numeroControlePNCP: op.numeroControlePNCP, 
                    numeroItem: item.numeroItem 
                  },
                  {
                    numeroControlePNCP: op.numeroControlePNCP,
                    numeroItem: item.numeroItem,
                    descricaoItem: item.descricao,
                    palavraChaveExtraida: keyword,
                    niFornecedor: res.niFornecedor,
                    nomeRazaoSocialFornecedor: res.nomeRazaoSocialFornecedor,
                    valorUnitarioHomologado: res.valorUnitarioHomologado,
                    valorTotalHomologado: res.valorTotalHomologado,
                    quantidadeHomologada: res.quantidadeHomologada,
                    dataResultado: res.dataResultado ? new Date(res.dataResultado) : new Date(),
                    uf: op.uf,
                  },
                  { upsert: true, new: true }
                );
              }
            }
          }
        }

        // Marca como verificado para não repetir o loop se já achou todos ou se passou muito tempo
        // OportunidadeSchema precisa aceitar 'resultadoVerificado' (pode ser any/mixed caso não esteja no schema)
        await this.oportunidadeModel.updateOne(
          { _id: op._id },
          { $set: { resultadoVerificado: true } as any }
        );

      } catch (e) {
        this.logger.error(`Erro ao processar ${op.numeroControlePNCP}: ${e.message}`);
      }
      
      // Sleep para rate limit
      await new Promise(r => setTimeout(r, 1000));
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
