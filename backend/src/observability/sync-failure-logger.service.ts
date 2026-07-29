import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SyncFailure, SyncFailureDocument } from './schemas/sync-failure.schema';

@Injectable()
export class SyncFailureLoggerService {
  private readonly logger = new Logger(SyncFailureLoggerService.name);

  constructor(
    @InjectModel(SyncFailure.name)
    private readonly syncFailureModel: Model<SyncFailureDocument>,
  ) {}

  async registrarFalha(params: {
    jobName: string;
    itemId: string;
    stage: string;
    error: Error;
    inputSnapshot?: unknown;
  }): Promise<void> {
    const { jobName, itemId, stage, error, inputSnapshot } = params;

    this.logger.warn(`[${jobName}] Falha em "${stage}" no item ${itemId}: ${error.message}`);

    await this.syncFailureModel.create({
      jobName,
      itemId,
      stage,
      errorMessage: error.message,
      errorStack: error.stack,
      inputSnapshot: inputSnapshot ? JSON.stringify(inputSnapshot).slice(0, 5000) : undefined,
    });
  }

  async listarFalhas(params: {
    jobName?: string;
    apenasNaoRevisadas?: boolean;
    limit?: number;
  }): Promise<SyncFailure[]> {
    const filtro: Record<string, unknown> = {};
    if (params.jobName) filtro.jobName = params.jobName;
    if (params.apenasNaoRevisadas) filtro.revisado = false;

    return this.syncFailureModel
      .find(filtro)
      .sort({ createdAt: -1 })
      .limit(params.limit ?? 100)
      .lean();
  }

  async resumoPorMotivo(jobName: string): Promise<{ stage: string; errorMessage: string; total: number }[]> {
    return this.syncFailureModel.aggregate([
      { $match: { jobName } },
      { $group: { _id: { stage: '$stage', errorMessage: '$errorMessage' }, total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $project: { _id: 0, stage: '$_id.stage', errorMessage: '$_id.errorMessage', total: 1 } },
    ]);
  }

  async marcarComoRevisado(id: string): Promise<void> {
    await this.syncFailureModel.updateOne({ _id: id }, { $set: { revisado: true } });
  }
}
