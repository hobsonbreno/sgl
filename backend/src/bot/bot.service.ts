import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotExecucao, BotExecucaoDocument } from './bot-execucao.schema';
import { PerfilBusca, PerfilBuscaDocument } from '../perfil-busca/perfil-busca.schema';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { Fornecedor, FornecedorDocument } from '../fornecedor/fornecedor.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { mapPncpParaOportunidade } from '../pncp/dtos/pncp.dto';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private emExecucao = false;

  constructor(
    @InjectModel(BotExecucao.name) private botExecucaoModel: Model<BotExecucaoDocument>,
    @InjectModel(PerfilBusca.name) private perfilBuscaModel: Model<PerfilBuscaDocument>,
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(Fornecedor.name) private fornecedorModel: Model<FornecedorDocument>,
    private readonly pncpClientService: PncpClientService,
  ) {}

  @Cron(process.env.BOT_CRON_EXPRESSION || CronExpression.EVERY_DAY_AT_6AM)
  async handleCron() {
    this.logger.log('Iniciando execução diária via CRON...');
    await this.executarBuscaDiaria();
  }

  async executarBuscaDiaria() {
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
          
          totalEncontrados += rawContratacoes.length;
          
          for (const raw of rawContratacoes) {
            const opDto = mapPncpParaOportunidade(raw);
            
            // Deduplicar e inserir
            const existe = await this.oportunidadeModel.findOne({ numeroControlePNCP: opDto.numeroControlePNCP });
            if (!existe) {
              await this.oportunidadeModel.create(opDto);
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
            }
            
            // Inserir Fornecedor / Orgao se não existir
            if (opDto.orgaoCnpj) {
              const fornecedorExiste = await this.fornecedorModel.findOne({ cnpj: opDto.orgaoCnpj });
              if (!fornecedorExiste) {
                await this.fornecedorModel.create({
                  cnpj: opDto.orgaoCnpj,
                  razaoSocial: opDto.orgaoNome,
                  origem: 'bot',
                  categorias: []
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
    
    this.emExecucao = false;
    return resultados;
  }
}
