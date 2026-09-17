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

  async logError(module: string, message: string, stacktrace?: any, metadata?: any) {
    try {
      await this.systemLogModel.create({
        level: 'error',
        module,
        message,
        stacktrace,
        metadata,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar erro no SystemLog: ${e.message}`);
    }
  }

  async logWarn(module: string, message: string, metadata?: any) {
    try {
      await this.systemLogModel.create({
        level: 'warn',
        module,
        message,
        metadata,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar warn no SystemLog: ${e.message}`);
    }
  }

  async logInfo(module: string, message: string, metadata?: any) {
    try {
      await this.systemLogModel.create({
        level: 'info',
        module,
        message,
        metadata,
      });
    } catch (e) {
      this.logger.error(`Falha ao gravar info no SystemLog: ${e.message}`);
    }
  }

  async getRecentLogs(limit = 100, level?: string, module?: string) {
    const query: any = {};
    if (level) query.level = level;
    if (module) query.module = module;

    return this.systemLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
