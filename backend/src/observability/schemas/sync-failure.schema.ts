import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncFailureDocument = SyncFailure & Document;

@Schema({ collection: 'SyncFailureLog', timestamps: true })
export class SyncFailure {
  @Prop({ required: true, index: true })
  jobName: string;

  @Prop({ required: true })
  itemId: string;

  @Prop({ required: true })
  stage: string;

  @Prop({ required: true })
  errorMessage: string;

  @Prop()
  errorStack?: string;

  @Prop()
  inputSnapshot?: string;

  @Prop({ default: false })
  revisado: boolean;
}

export const SyncFailureSchema = SchemaFactory.createForClass(SyncFailure);

SyncFailureSchema.index({ jobName: 1, createdAt: -1 });
SyncFailureSchema.index({ revisado: 1 });
