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
    // REMOVIDO: O nível 'log/info' não deve persistir no banco por padrão
    // pois inunda o SystemLog com milhares de registros de rotina.
    // Se precisarmos persistir infos, usaremos this.systemLog.logInfo() diretamente onde for relevante.
  }

  error(message: any, trace?: string, context?: string) {
    this.pino.error(message, trace, context);
    if (this.shouldLogToDb(context, message)) {
      this.systemLog.logError(
        context || 'App',
        this.formatMessage(message),
        trace,
      );
    }
  }

  warn(message: any, context?: string) {
    this.pino.warn(message, context);
    if (this.shouldLogToDb(context, message)) {
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

  private shouldLogToDb(context?: string, message?: any): boolean {
    const ignoredContexts = [
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
      'PncpClientService', // Cliente PNCP é muito ruidoso
    ];

    if (context && ignoredContexts.includes(context)) {
      return false;
    }

    // Ignora mensagens de fila do PNCP que são ruído operacional normal
    const msgStr = this.formatMessage(message);
    if (msgStr.includes('[PNCP_QUEUE]')) {
      return false;
    }

    return true;
  }
}
