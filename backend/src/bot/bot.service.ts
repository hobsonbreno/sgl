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
import { EventsService } from '../events/events.service';

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
    @Inject(forwardRef(() => ConfiguracaoService)) private configService: ConfiguracaoService,
    private eventsService: EventsService
  ) {}

  async onApplicationBootstrap() {
    const config = await this.configService.getConfiguracao();
    const horarios = config?.horariosBuscaBot && config.horariosBuscaBot.length > 0 ? config.horariosBuscaBot : ['08:00', '12:00', '18:00'];
    
    // Registrar Cron Job
    await this.registrarCronDinamicoMultiplos(horarios);

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

  async registrarCronDinamicoMultiplos(horarios: string[]) {
    // Remove o job antigo (single)
    if (this.schedulerRegistry.doesExist('cron', 'botBuscaDiaria')) {
      this.schedulerRegistry.deleteCronJob('botBuscaDiaria');
    }

    // Remove os jobs multi antigos
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key) => {
      if (key.startsWith('botBuscaDiaria_')) {
        this.schedulerRegistry.deleteCronJob(key);
      }
    });

    horarios.forEach((horario, index) => {
      const nomeJob = `botBuscaDiaria_${index}`;
      const [hora, minuto] = horario.split(':');
      const cronExpression = `${minuto} ${hora} * * *`;

      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`Cron disparado às ${horario}...`);
        await this.executarBuscaDiaria(true);
      });

      this.schedulerRegistry.addCronJob(nomeJob, job);
      job.start();
      this.logger.log(`Cron dinâmico registrado para: ${horario} (expressão: ${cronExpression})`);
    });
  }

  async executarBuscaDiaria(isAutomatic = false) {
    if (this.emExecucao) {
      this.logger.warn('Bot já está em execução. Ignorando nova requisição.');
      return { message: 'Bot já está em execução.' };
    }
    
    this.emExecucao = true;
    this.eventsService.emitDashboardUpdate();
    const perfis = await this.perfilBuscaModel.find({ ativo: true });
    
    const resultados = [];
    
    for (const perfil of perfis) {
      this.logger.log(`Executando perfil: ${perfil.nome}`);
      let totalEncontrados = 0;
      let totalNovos = 0;
      const erros = [];
      
      const dataFinalDate = new Date();
      dataFinalDate.setDate(dataFinalDate.getDate() + 30); // 30 dias pra frente como limite final
      const yyyyF = dataFinalDate.getFullYear();
      const mmF = String(dataFinalDate.getMonth() + 1).padStart(2, '0');
      const ddF = String(dataFinalDate.getDate()).padStart(2, '0');
      const dataFinal = `${yyyyF}${mmF}${ddF}`;

      // PNCP API exige dataInicial. Vamos buscar editais publicados nos últimos 30 dias
      const dataInicialDate = new Date();
      dataInicialDate.setDate(dataInicialDate.getDate() - 30);
      const yyyyI = dataInicialDate.getFullYear();
      const mmI = String(dataInicialDate.getMonth() + 1).padStart(2, '0');
      const ddI = String(dataInicialDate.getDate()).padStart(2, '0');
      const dataInicial = `${yyyyI}${mmI}${ddI}`;

      for (const modalidade of perfil.modalidades) {
        try {
          const rawContratacoes = await this.pncpClientService.buscarContratacoesComPropostaAberta({
            dataInicial,
            dataFinal,
            codigoModalidadeContratacao: modalidade,
            uf: perfil.ufs && perfil.ufs.length > 0 ? perfil.ufs[0] : undefined,
            codigoMunicipioIbge: perfil.municipiosIbge && perfil.municipiosIbge.length > 0 ? perfil.municipiosIbge[0] : undefined,
            cnpj: perfil.orgaosCnpj && perfil.orgaosCnpj.length > 0 ? perfil.orgaosCnpj[0] : undefined,
            codigoUnidadeAdministrativa: perfil.unidadesUasg && perfil.unidadesUasg.length > 0 ? perfil.unidadesUasg[0] : undefined,
          });
          
          for (const raw of rawContratacoes) {
            const opDto = mapPncpParaOportunidade(raw);
            
            // FILTRO DE FONTE (PORTAL DE ORIGEM)
            const fontesPermitidas = [
              'Secretaria do Planejamento e Gestão do Ceará',
              'Compras.gov.br',
              'MUNICIPIO DE FORTALEZA'
            ];
            
            const usuarioNome = raw.usuarioNome;
            if (usuarioNome) {
              const fonteValida = fontesPermitidas.some(f => usuarioNome.toLowerCase().includes(f.toLowerCase()));
              if (!fonteValida) {
                // Descarta portais pagos (ex: M2A, Licita + Brasil, BLL Compras, BR Conectado)
                continue;
              }
            }

            // FILTRO DE PALAVRAS CHAVE (PRODUTOS)
            if (perfil.palavrasChave && perfil.palavrasChave.length > 0) {
              const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
              const objetoCompra = normalizar(opDto.objetoCompra);
              
              let match = perfil.palavrasChave.some(p => {
                const keyword = normalizar(p);
                return keyword.length > 0 && objetoCompra.includes(keyword);
              });
              
              // DEEP SEARCH: Se não achou no título genérico, vasculha a lista de itens reais do edital
              if (!match) {
                try {
                  const itensDaCompra = await this.pncpClientService.buscarItensDaContratacao(opDto.numeroControlePNCP);
                  match = itensDaCompra.some(item => {
                    const descItem = normalizar(item.descricao);
                    return perfil.palavrasChave.some(p => {
                       const keyword = normalizar(p);
                       return keyword.length > 0 && descItem.includes(keyword);
                    });
                  });
                  // Aguarda um pouco para não estourar o limite de requisições do PNCP na busca de itens
                  await new Promise(r => setTimeout(r, 600));
                } catch (err) {
                  this.logger.warn(`Erro na Deep Search de Itens para ${opDto.numeroControlePNCP}: ${err.message}`);
                }
              }
              
              if (!match) continue; // Pula se não bater a palavra chave nem no objeto e nem nos itens
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
    this.eventsService.emitDashboardUpdate();
    return resultados;
  }

  isExecucao(): boolean {
    return this.emExecucao;
  }
}
