import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SystemLog extends Document {
  /** Nível de severidade do log */
  @Prop({ required: true })
  level: 'error' | 'warn' | 'info';

  /** Módulo/serviço que gerou o log (ex: 'Bot', 'PncpClient', 'GlobalExceptionFilter') */
  @Prop({ required: true, index: true })
  modulo: string;

  /** Mensagem legível do evento */
  @Prop({ required: true })
  message: string;

  /** Stack trace do erro (apenas para logs de nível 'error') */
  @Prop({ type: Object })
  stacktrace?: any;

  /** Dados adicionais estruturados para contexto (ex: correlationId, perfilNome) */
  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  /**
   * ID de correlação para rastrear todos os logs de uma mesma execução do bot.
   * Compartilhado com BotExecucao.correlationId.
   */
  @Prop({ index: true })
  correlationId?: string;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);

// Índice composto para queries de filtragem comuns no painel
SystemLogSchema.index({ level: 1, modulo: 1 });
SystemLogSchema.index({ createdAt: -1 });

// TTL automático: logs expiram após 30 dias para evitar crescimento ilimitado da collection
SystemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
