import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SystemLogService } from '../system-log/system-log.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly systemLogService: SystemLogService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // Apenas logamos erros 500 ou não tratados. Ignoramos 400, 401, 404
    if (status >= 500) {
      await this.systemLogService.logError(
        'GlobalExceptionFilter',
        message,
        stack,
        {
          path: request.url,
          method: request.method,
          body: request.body,
          query: request.query,
        }
      );
    }

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message,
      });
  }
}
