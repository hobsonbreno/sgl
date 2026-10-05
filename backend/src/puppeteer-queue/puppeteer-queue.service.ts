import { Injectable, Logger } from '@nestjs/common';
import PQueue from 'p-queue';

@Injectable()
export class PuppeteerQueueService {
  private readonly logger = new Logger(PuppeteerQueueService.name);
  private readonly queue = new PQueue({ concurrency: 1 });

  async enqueue<T>(
    taskName: string,
    fn: () => Promise<T>,
    priority: number = 0,
  ): Promise<T> {
    this.logger.log(
      `Enqueuing Puppeteer task: ${taskName} with priority ${priority}. Pending: ${this.queue.size + this.queue.pending}`,
    );

    return this.queue.add(
      async () => {
        this.logger.log(`Starting Puppeteer task: ${taskName}`);
        try {
          return await fn();
        } finally {
          this.logger.log(`Finished Puppeteer task: ${taskName}`);
        }
      },
      { priority },
    );
  }
}
