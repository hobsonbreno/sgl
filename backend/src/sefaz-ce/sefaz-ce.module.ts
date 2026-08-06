import { Module } from '@nestjs/common';
import { SefazCeScraperService } from './sefaz-ce-scraper.service';

@Module({
  providers: [SefazCeScraperService],
  exports: [SefazCeScraperService],
})
export class SefazCeModule {}
