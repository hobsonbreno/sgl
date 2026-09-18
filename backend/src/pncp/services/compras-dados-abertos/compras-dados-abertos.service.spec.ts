import { Test, TestingModule } from '@nestjs/testing';
import { ComprasDadosAbertosService } from './compras-dados-abertos.service';
import { getModelToken } from '@nestjs/mongoose';
import { ResultadoItem } from '../../schemas/resultado-item.schema';
import { Oportunidade } from '../../../oportunidade/oportunidade.schema';
import { Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

describe('ComprasDadosAbertosService', () => {
  let service: ComprasDadosAbertosService;
  let resultadoItemModel: any;

  beforeEach(async () => {
    resultadoItemModel = {
      find: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    
    const oportunidadeModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasDadosAbertosService,
        { provide: getModelToken(ResultadoItem.name), useValue: resultadoItemModel },
        { provide: getModelToken(Oportunidade.name), useValue: oportunidadeModel },
      ],
    }).compile();

    service = module.get<ComprasDadosAbertosService>(ComprasDadosAbertosService);
    
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

  describe('pesquisarHistoricoPrecos', () => {
    it('should return empty result if keyword is invalid', async () => {
      const result1 = await service.pesquisarHistoricoPrecos('', 'CE');
      const result2 = await service.pesquisarHistoricoPrecos(' ', 'CE');
      const result3 = await service.pesquisarHistoricoPrecos('Produto', 'CE');

      expect(result1.semDados).toBe(true);
      expect(result2.semDados).toBe(true);
      expect(result3.semDados).toBe(true);
      expect(resultadoItemModel.find).not.toHaveBeenCalled();
    });

    it('should return empty result if no items found in DB', async () => {
      resultadoItemModel.lean.mockResolvedValueOnce([]);
      
      const result = await service.pesquisarHistoricoPrecos('Frango', 'CE');
      
      expect(result.semDados).toBe(true);
      expect(resultadoItemModel.find).toHaveBeenCalled();
    });

    it('should calculate metrics correctly and filter out outliers', async () => {
      const mockItems = [
        { uf: 'CE', valorUnitarioHomologado: 10, nomeRazaoSocialFornecedor: 'Fornec A' },
        { uf: 'CE', valorUnitarioHomologado: 100, nomeRazaoSocialFornecedor: 'Fornec B' },
        { uf: 'CE', valorUnitarioHomologado: 95, nomeRazaoSocialFornecedor: 'Fornec B' },
        { uf: 'CE', valorUnitarioHomologado: 105, nomeRazaoSocialFornecedor: 'Fornec C' },
        { uf: 'CE', valorUnitarioHomologado: 1000, nomeRazaoSocialFornecedor: 'Fornec D' }, // outlier high
        { uf: 'CE', valorUnitarioHomologado: 1, nomeRazaoSocialFornecedor: 'Fornec E' }, // outlier low
      ];
      
      resultadoItemModel.lean.mockResolvedValueOnce(mockItems);

      const result = await service.pesquisarHistoricoPrecos('Computador', 'CE');

      // The valid prices are 10, 95, 100, 105. 
      // Sorted: 1, 10, 95, 100, 105, 1000. 
      // Median of 6 elements: (95+100)/2 = 97.5
      // Valid range: 97.5 * 0.2 = 19.5 to 97.5 * 5 = 487.5
      // Filtered prices: 95, 100, 105 (3 elements)
      
      expect(result.sucesso).toBe(true);
      expect(result.amostraEncontrada).toBe(3);
      expect(result.precoMinimo).toBe(95);
      expect(result.precoMaximo).toBe(105);
      expect(result.precoMedio).toBe(100);
      expect(result.baixaConfianca).toBe(true); // < 5 samples
      expect(result.topVencedores.length).toBeGreaterThan(0);
      expect(result.topVencedores[0].nome).toBe('Fornec B'); // Has 2 wins
    });
    
    it('should return raw prices if filtering removes everything', async () => {
      const mockItems = [
        { uf: 'CE', valorUnitarioHomologado: 100, nomeRazaoSocialFornecedor: 'Fornec A' }
      ];
      resultadoItemModel.lean.mockResolvedValueOnce(mockItems);

      const result = await service.pesquisarHistoricoPrecos('Monitor', 'CE');
      expect(result.amostraEncontrada).toBe(1);
      expect(result.precoMedio).toBe(100);
    });

    it('should fallback to national search if no items found for UF', async () => {
      const mockItems = [
        { uf: 'SP', valorUnitarioHomologado: 100, nomeRazaoSocialFornecedor: 'Fornec SP' },
        { uf: 'RJ', valorUnitarioHomologado: 150, nomeRazaoSocialFornecedor: 'Fornec RJ' },
      ];
      
      resultadoItemModel.lean.mockResolvedValueOnce(mockItems);

      const result = await service.pesquisarHistoricoPrecos('Mesa', 'CE');

      expect(result.amostraEncontrada).toBe(2);
      expect(result.topVencedores.find((v: any) => v.nome === 'Fornec SP')).toBeDefined();
    });

    it('should return empty result if fallback national search also yields 0 items', async () => {
      const mockItems = [
        { uf: 'SP', valorUnitarioHomologado: 0, nomeRazaoSocialFornecedor: 'Fornec SP' }, // invalid price
      ];
      
      resultadoItemModel.lean.mockResolvedValueOnce(mockItems);

      const result = await service.pesquisarHistoricoPrecos('Mesa', 'CE');

      expect(result.semDados).toBe(true);
    });
    
    it('should use Fornecedor Desconhecido if nomeRazaoSocialFornecedor is empty', async () => {
      const mockItems = [
        { uf: 'CE', valorUnitarioHomologado: 100 }
      ];
      
      resultadoItemModel.lean.mockResolvedValueOnce(mockItems);

      const result = await service.pesquisarHistoricoPrecos('Mesa', 'CE');

      expect(result.topVencedores[0].nome).toBe('Fornecedor Desconhecido');
    });

    it('should throw HttpException on DB error', async () => {
      resultadoItemModel.lean.mockRejectedValueOnce(new Error('DB Failed'));

      await expect(service.pesquisarHistoricoPrecos('Caneta', 'CE')).rejects.toThrow(HttpException);
    });
  });
});
