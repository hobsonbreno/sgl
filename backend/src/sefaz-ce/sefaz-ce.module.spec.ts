import { Test, TestingModule } from '@nestjs/testing';
import { SefazCeModule } from './sefaz-ce.module';
import { SefazCeScraperService } from './sefaz-ce-scraper.service';

describe('SefazCeModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SefazCeModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide SefazCeScraperService', () => {
    const service = module.get<SefazCeScraperService>(SefazCeScraperService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(SefazCeScraperService);
  });
});
