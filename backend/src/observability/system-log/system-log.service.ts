import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemLog } from './system-log.schema';

@Injectable()
export class SystemLogService {
  private readonly logger = new Logger(SystemLogService.name);

  constructor(
    @InjectModel(SystemLog.name)
    private readonly systemLogModel: Model<SystemLog>,
  ) {}

  async logError(
    modulo: string,
    message: string,
    stacktrace?: any,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.systemLogModel.create({
        level: 'error',
        modulo,
        message,
        stacktrace,
        metadata,
        correlationId: metadata?.correlationId as string,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar erro no SystemLog: ${e.message}`);
    }
  }

  async logWarn(
    modulo: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.systemLogModel.create({
        level: 'warn',
        modulo,
        message,
        metadata,
        correlationId: metadata?.correlationId as string,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar warn no SystemLog: ${e.message}`);
    }
  }

  async logInfo(
    modulo: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.systemLogModel.create({
        level: 'info',
        modulo,
        message,
        metadata,
        correlationId: metadata?.correlationId as string,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar info no SystemLog: ${e.message}`);
    }
  }

  async getRecentLogs(
    limit = 100,
    level?: string,
    modulo?: string,
    correlationId?: string,
  ) {
    const query: any = {};
    if (level) query.level = level;
    if (modulo) query.modulo = modulo;
    if (correlationId) query.correlationId = correlationId;

    return this.systemLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getLogStats(dataInicio?: Date, dataFim?: Date) {
    const query: any = {};
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = dataInicio;
      if (dataFim) query.createdAt.$lte = dataFim;
    }

    return this.systemLogModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: { modulo: '$modulo', level: '$level' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          modulo: '$_id.modulo',
          level: '$_id.level',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}
