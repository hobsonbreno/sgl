import { Module, Global } from '@nestjs/common';
import { PuppeteerQueueService } from './puppeteer-queue.service';

@Global()
@Module({
  providers: [PuppeteerQueueService],
  exports: [PuppeteerQueueService],
})
export class PuppeteerQueueModule {}
