import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type BotExecucaoDocument = HydratedDocument<BotExecucao>;

/** Registro de erro ocorrido durante a execução do bot para um perfil/modalidade */
export class BotErroExecucao {
  /** Modalidade de contratação (ex: 8 = Pregão Eletrônico) */
  modalidade: number;
  /** Nome do perfil de busca associado ao erro */
  perfilNome: string;
  /** Mensagem de erro legível */
  mensagem: string;
  /** Stack trace do erro (quando disponível) */
  stack?: string;
  /** Momento em que o erro ocorreu */
  dataHora: Date;
}

/** Contadores por motivo de descarte — útil para auditar filtros do bot */
export class BotFiltrosEstatisticas {
  /** Descartados por não baterem na fonte/portal permitida */
  descartadosFonte: number;
  /** Descartados por não pertencerem ao município/IBGE configurado */
  descartadosMunicipio: number;
  /** Descartados por não baterem nas palavras-chave (nem no título, nem nos itens) */
  descartadosPalavraChave: number;
  /** Descartados por CNPJ de órgão não estar na lista do perfil */
  descartadosCnpjOrgao: number;
  /** Descartados por código UASG não estar na lista do perfil */
  descartadosUasg: number;
  /** Oportunidades já existentes no banco que tiveram dados atualizados */
  atualizados: number;
}

@Schema({ timestamps: true })
export class BotExecucao {
  /**
   * ID único desta execução — compartilhado com os SystemLogs gerados durante ela.
   * Permite rastrear todos os eventos de uma única rodada do bot no banco de logs.
   */
  @Prop({ required: true, index: true })
  correlationId: string;

  /** Data/hora em que a execução iniciou */
  @Prop({ required: true, default: Date.now })
  dataExecucao: Date;

  /** Referência ao perfil de busca que gerou este resultado */
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'PerfilBusca' })
  perfilBuscaId: mongoose.Types.ObjectId;

  /** Nome do perfil (desnormalizado para facilitar exibição sem join) */
  @Prop()
  perfilNome: string;

  /** Total de oportunidades retornadas pela API do PNCP antes de qualquer filtro */
  @Prop({ required: true })
  totalEncontrados: number;

  /** Total de oportunidades novas inseridas no banco nesta execução */
  @Prop({ required: true })
  totalNovos: number;

  /** Duração total desta execução em milissegundos */
  @Prop()
  duracaoMs: number;

  /** Estatísticas detalhadas de quantas oportunidades foram descartadas por cada filtro */
  @Prop({ type: Object })
  filtros: BotFiltrosEstatisticas;

  /** Lista de erros ocorridos durante a execução (tipada e estruturada) */
  @Prop({
    type: [
      {
        modalidade: Number,
        perfilNome: String,
        mensagem: String,
        stack: String,
        dataHora: Date,
      },
    ],
    default: [],
  })
  erros: BotErroExecucao[];
}

export const BotExecucaoSchema = SchemaFactory.createForClass(BotExecucao);

// Índices para queries comuns no painel de logs
BotExecucaoSchema.index({ dataExecucao: -1 });
BotExecucaoSchema.index({ correlationId: 1 });
BotExecucaoSchema.index({ perfilBuscaId: 1, dataExecucao: -1 });
