import { Test, TestingModule } from '@nestjs/testing';
import { ReceitaFederalService } from './receita-federal.service';

describe('ReceitaFederalService', () => {
  let service: ReceitaFederalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceitaFederalService],
    }).compile();

    service = module.get<ReceitaFederalService>(ReceitaFederalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
