import { Test, TestingModule } from '@nestjs/testing';
import { PerfilBuscaService } from './perfil-busca.service';

describe('PerfilBuscaService', () => {
  let service: PerfilBuscaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerfilBuscaService],
    }).compile();

    service = module.get<PerfilBuscaService>(PerfilBuscaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
