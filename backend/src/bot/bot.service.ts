import { Injectable, Logger, OnApplicationBootstrap, forwardRef, Inject } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotExecucao, BotExecucaoDocument } from './bot-execucao.schema';
import { PerfilBusca, PerfilBuscaDocument } from '../perfil-busca/perfil-busca.schema';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { Orgao, OrgaoDocument } from '../orgao/orgao.schema';
import { Produto, ProdutoDocument } from '../produto/produto.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { mapPncpParaOportunidade } from '../pncp/dtos/pncp.dto';
import { ConfiguracaoService } from '../configuracao/configuracao.service';

@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);
  private emExecucao = false;

  constructor(
    @InjectModel(BotExecucao.name) private botExecucaoModel: Model<BotExecucaoDocument>,
    @InjectModel(PerfilBusca.name) private perfilBuscaModel: Model<PerfilBuscaDocument>,
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(Orgao.name) private orgaoModel: Model<OrgaoDocument>,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    private readonly pncpClientService: PncpClientService,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => ConfiguracaoService)) private configService: ConfiguracaoService
  ) {}

  async onApplicationBootstrap() {
    const config = await this.configService.getConfiguracao();
    const horario = config?.horarioBuscaBot || '06:00';
    
    // Registrar Cron Job
    await this.registrarCronDinamico(horario);

    // Lógica de recuperação ao iniciar o sistema
    setTimeout(async () => {
      try {
        const hojeDate = new Date();
        const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
        
        const currentConfig = await this.configService.getConfiguracao();
        if (currentConfig && currentConfig.ultimaExecucaoAutomaticaData !== dataHoje) {
          this.logger.log(`Recuperação pós-boot: Bot não rodou hoje (${dataHoje}). Iniciando busca diária...`);
          await this.executarBuscaDiaria(true);
        } else {
          this.logger.log(`Boot verificado: Bot já rodou hoje (${dataHoje}).`);
        }
      } catch (err) {
        this.logger.error('Erro na recuperação de boot: ' + err.message);
      }
    }, 15000); // 15s de delay
  }

  async registrarCronDinamico(horario: string) {
    const nomeJob = 'botBuscaDiaria';
    
    try {
      if (this.schedulerRegistry.doesExist('cron', nomeJob)) {
        this.schedulerRegistry.deleteCronJob(nomeJob);
      }
    } catch (e) {
      // ignore Se não existir
    }

    const [hora, minuto] = horario.split(':');
    const cronExpression = `${minuto} ${hora} * * *`;

    const job = new CronJob(cronExpression, async () => {
      this.logger.log(`Cron disparado às ${horario}...`);
      await this.executarBuscaDiaria(true);
    });

    this.schedulerRegistry.addCronJob(nomeJob, job);
    job.start();
    this.logger.log(`Cron dinâmico registrado para: ${horario} (expressão: ${cronExpression})`);
  }

  async executarBuscaDiaria(isAutomatic = false) {
    if (this.emExecucao) {
      this.logger.warn('Bot já está em execução. Ignorando nova requisição.');
      return { message: 'Bot já está em execução.' };
    }
    
    this.emExecucao = true;
    const perfis = await this.perfilBuscaModel.find({ ativo: true });
    
    const resultados = [];
    
    for (const perfil of perfis) {
      this.logger.log(`Executando perfil: ${perfil.nome}`);
      let totalEncontrados = 0;
      let totalNovos = 0;
      const erros = [];
      
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + 30); // 30 dias pra frente como default
      const yyyy = hoje.getFullYear();
      const mm = String(hoje.getMonth() + 1).padStart(2, '0');
      const dd = String(hoje.getDate()).padStart(2, '0');
      const dataFinal = `${yyyy}${mm}${dd}`;

      for (const modalidade of perfil.modalidades) {
        try {
          const rawContratacoes = await this.pncpClientService.buscarContratacoesComPropostaAberta({
            dataFinal,
            codigoModalidadeContratacao: modalidade,
            uf: perfil.ufs && perfil.ufs.length > 0 ? perfil.ufs[0] : undefined,
          });
          
          for (const raw of rawContratacoes) {
            const opDto = mapPncpParaOportunidade(raw);
            
            // FILTRO DE PALAVRAS CHAVE (PRODUTOS)
            if (perfil.palavrasChave && perfil.palavrasChave.length > 0) {
              const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
              const objetoCompra = normalizar(opDto.objetoCompra);
              
              const match = perfil.palavrasChave.some(p => {
                const keyword = normalizar(p);
                return keyword.length > 0 && objetoCompra.includes(keyword);
              });
              
              if (!match) continue; // Pula se não bater a palavra chave
            }

            totalEncontrados++;
            
            // Deduplicar e inserir
            const existe = await this.oportunidadeModel.findOne({ numeroControlePNCP: opDto.numeroControlePNCP });
            let oportunidadeId = '';

            if (!existe) {
              const novaOp = await this.oportunidadeModel.create(opDto);
              oportunidadeId = novaOp._id.toString();
              totalNovos++;
            } else {
              await this.oportunidadeModel.updateOne(
                { numeroControlePNCP: opDto.numeroControlePNCP },
                { 
                  $set: { 
                    situacaoCompraNome: opDto.situacaoCompraNome,
                    dataEncerramentoProposta: opDto.dataEncerramentoProposta,
                    valorTotalEstimado: opDto.valorTotalEstimado 
                  }
                }
              );
              oportunidadeId = existe._id.toString();
            }
            
            // Inserir Orgao se não existir
            if (opDto.orgaoCnpj) {
              const orgaoExiste = await this.orgaoModel.findOne({ cnpj: opDto.orgaoCnpj });
              if (!orgaoExiste) {
                await this.orgaoModel.create({
                  cnpj: opDto.orgaoCnpj,
                  nome: opDto.orgaoNome,
                  origem: 'bot'
                });
              }
            }
          }
        } catch (err) {
          this.logger.error(`Erro ao buscar modalidade ${modalidade} do perfil ${perfil.nome}: ${err.message}`);
          erros.push(err.message);
        }
      }
      
      const execucao = await this.botExecucaoModel.create({
        perfilBuscaId: perfil._id,
        totalEncontrados,
        totalNovos,
        erros,
      });
      resultados.push(execucao);
    }
    
    if (isAutomatic) {
      const hojeDate = new Date();
      const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
      await this.configService.setUltimaExecucao(dataHoje);
      this.logger.log(`Busca automática concluída. Data registrada: ${dataHoje}`);
    }

    this.emExecucao = false;
    return resultados;
  }
}
