import { Test, TestingModule } from '@nestjs/testing';
import { OportunidadeService } from './oportunidade.service';

describe('OportunidadeService', () => {
  let service: OportunidadeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OportunidadeService],
    }).compile();

    service = module.get<OportunidadeService>(OportunidadeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
