import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';

@Injectable()
export class PuppeteerQueueService {
  private readonly logger = new Logger(PuppeteerQueueService.name);
  private readonly limit = pLimit(1);

  async enqueue<T>(taskName: string, fn: () => Promise<T>): Promise<T> {
    this.logger.log(`Enqueuing Puppeteer task: ${taskName}. Pending: ${this.limit.activeCount + this.limit.pendingCount}`);
    return this.limit(async () => {
      this.logger.log(`Starting Puppeteer task: ${taskName}`);
      try {
        return await fn();
      } finally {
        this.logger.log(`Finished Puppeteer task: ${taskName}`);
      }
    });
  }
}
