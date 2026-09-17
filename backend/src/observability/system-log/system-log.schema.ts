import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SystemLog extends Document {
  @Prop({ required: true })
  level: string; // 'error', 'warn', 'info'

  @Prop({ required: true })
  module: string; // Ex: 'GlobalExceptionFilter', 'PncpClient', 'Bot'

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  stacktrace?: any;

  @Prop({ type: Object })
  metadata?: any;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);
