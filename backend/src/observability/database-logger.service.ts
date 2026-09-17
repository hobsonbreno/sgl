import { Injectable, LoggerService } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { SystemLogService } from './system-log/system-log.service';

@Injectable()
export class DatabaseLoggerService implements LoggerService {
  constructor(
    private readonly pino: PinoLogger,
    private readonly systemLog: SystemLogService,
  ) {}

  log(message: any, context?: string) {
    this.pino.log(message, context);
    if (this.shouldLogToDb(context)) {
      this.systemLog.logInfo(context || 'App', this.formatMessage(message));
    }
  }

  error(message: any, trace?: string, context?: string) {
    this.pino.error(message, trace, context);
    if (this.shouldLogToDb(context)) {
      this.systemLog.logError(context || 'App', this.formatMessage(message), trace);
    }
  }

  warn(message: any, context?: string) {
    this.pino.warn(message, context);
    if (this.shouldLogToDb(context)) {
      this.systemLog.logWarn(context || 'App', this.formatMessage(message));
    }
  }

  debug(message: any, context?: string) {
    this.pino.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.pino.verbose(message, context);
  }

  private formatMessage(message: any): string {
    return typeof message === 'string' ? message : JSON.stringify(message);
  }

  private shouldLogToDb(context?: string): boolean {
    if (!context) return true;
    const ignored = [
      'RouterExplorer',
      'RoutesResolver',
      'InstanceLoader',
      'NestFactory',
      'MongooseModule',
      'MongoDB',
      'ExceptionsHandler',
      'NestApplication',
      'HTTP',
      'SwaggerModule',
      'DatabaseLoggerService',
    ];
    return !ignored.includes(context);
  }
}
