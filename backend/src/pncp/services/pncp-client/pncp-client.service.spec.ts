import { Test, TestingModule } from '@nestjs/testing';
import { PncpClientService } from './pncp-client.service';

describe('PncpClientService', () => {
  let service: PncpClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PncpClientService],
    }).compile();

    service = module.get<PncpClientService>(PncpClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
