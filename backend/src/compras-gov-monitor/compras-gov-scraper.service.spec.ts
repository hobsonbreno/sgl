import { Test, TestingModule } from '@nestjs/testing';
import { ComprasGovScraperService } from './compras-gov-scraper.service';

describe('ComprasGovScraperService', () => {
  let service: ComprasGovScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComprasGovScraperService],
    }).compile();

    service = module.get<ComprasGovScraperService>(ComprasGovScraperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
