import { Test, TestingModule } from '@nestjs/testing';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';

describe('ComprasGovMonitorService', () => {
  let service: ComprasGovMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComprasGovMonitorService],
    }).compile();

    service = module.get<ComprasGovMonitorService>(ComprasGovMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
