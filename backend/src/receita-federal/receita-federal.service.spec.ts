import { Test, TestingModule } from '@nestjs/testing';
import { ReceitaFederalService } from './receita-federal.service';
import { getModelToken } from '@nestjs/mongoose';
import { EmpresaDataLake } from './receita-federal.schema';
import { Logger } from '@nestjs/common';

describe('ReceitaFederalService', () => {
  let service: ReceitaFederalService;
  let model: any;

  beforeEach(async () => {
    model = {
      distinct: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(['12345678']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceitaFederalService,
        {
          provide: getModelToken(EmpresaDataLake.name),
          useValue: model,
        },
      ],
    }).compile();

    service = module.get<ReceitaFederalService>(ReceitaFederalService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runETLPipeline', () => {
    it('should orchestrate the ETL pipeline successfully', async () => {
      // Mock the internal private methods that have heavy I/O
      (service as any).loadDicionario = jest.fn().mockResolvedValue(new Map());
      (service as any).processEstabelecimentos = jest.fn().mockResolvedValue(true);
      (service as any).processEmpresas = jest.fn().mockResolvedValue(true);

      await service.runETLPipeline();

      expect((service as any).loadDicionario).toHaveBeenCalledTimes(2);
      expect((service as any).processEstabelecimentos).toHaveBeenCalledTimes(10); // 0 to 9 pacotes
      expect(model.distinct).toHaveBeenCalledWith('cnpj_basico', { uf: 'CE' });
      expect((service as any).processEmpresas).toHaveBeenCalledTimes(10);
    });
  });
});
