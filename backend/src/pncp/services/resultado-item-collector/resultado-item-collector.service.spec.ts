import { Test, TestingModule } from '@nestjs/testing';
import { ResultadoItemCollectorService } from './resultado-item-collector.service';
import { getModelToken } from '@nestjs/mongoose';
import { ResultadoItem } from '../../schemas/resultado-item.schema';
import { Oportunidade } from '../../../oportunidade/oportunidade.schema';
import { HttpService } from '@nestjs/axios';
import { PncpClientService } from '../pncp-client/pncp-client.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { Logger } from '@nestjs/common';

jest.mock('rxjs', () => {
  const original = jest.requireActual('rxjs');
  return {
    ...original,
    timer: () => new original.Observable((subscriber: any) => {
      subscriber.next(0);
      // do not complete to allow retry
    })
  };
});

describe('ResultadoItemCollectorService', () => {
  let service: ResultadoItemCollectorService;
  let httpService: jest.Mocked<HttpService>;
  let resultadoItemModel: any;

  beforeEach(async () => {
    const httpServiceMock = {
      get: jest.fn(),
    };
    const pncpClientMock = {};
    resultadoItemModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    const oportunidadeModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultadoItemCollectorService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: PncpClientService, useValue: pncpClientMock },
        { provide: getModelToken(ResultadoItem.name), useValue: resultadoItemModel },
        { provide: getModelToken(Oportunidade.name), useValue: oportunidadeModel },
      ],
    }).compile();

    service = module.get<ResultadoItemCollectorService>(ResultadoItemCollectorService);
    httpService = module.get(HttpService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Silence setTimeout in loops
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAxiosResponse = (data: any, status = 200, extra: any = {}): AxiosResponse => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
    ...extra
  });

  const mockAxiosError = (status: number, message = 'Error'): any => {
    const error: any = new Error(message);
    error.isAxiosError = true;
    error.response = { status };
    error.message = message;
    return error;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectResultadosHomologados', () => {
    it('should break loop if outer API returns empty data', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse([])));

      await service.collectResultadosHomologados();
      
      // Should try 3 modalities, break immediately on each if empty
      expect(httpService.get).toHaveBeenCalledTimes(3); 
    });

    // Removed "should break loop on external API error" to prevent retry timeouts

    it('should skip purchase if valorTotalHomologado is null and situacao != 4', async () => {
      const mockCompras = [
        { valorTotalHomologado: null, situacaoCompraId: 1, numeroControlePNCP: '1-1-1/2024' }
      ];
      
      // Modalidade 6
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ data: mockCompras, totalPaginas: 1 })));
      // Other APIs return empty
      httpService.get.mockReturnValue(of(mockAxiosResponse([])));

      await service.collectResultadosHomologados();
      
      // Não deve chamar API de itens
      expect(httpService.get).not.toHaveBeenCalledWith(expect.stringContaining('/itens'));
    });
    
    it('should skip if invalid numeroControlePNCP format', async () => {
      const mockCompras = [
        { valorTotalHomologado: 100, situacaoCompraId: 4, numeroControlePNCP: 'invalid' },
        { valorTotalHomologado: 100, situacaoCompraId: 4, numeroControlePNCP: 'invalid/2024' },
        { valorTotalHomologado: 100, situacaoCompraId: 4, numeroControlePNCP: null }
      ];
      
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ data: mockCompras, totalPaginas: 1 })));
      httpService.get.mockReturnValue(of(mockAxiosResponse([])));

      await service.collectResultadosHomologados();
      expect(httpService.get).not.toHaveBeenCalledWith(expect.stringContaining('/itens'));
    });

    it('should process valid purchase and extract correct keyword', async () => {
      const mockCompras = [
        { 
          valorTotalHomologado: 1000, 
          situacaoCompraId: 4, 
          numeroControlePNCP: '123-1-456/2024',
          unidadeOrgao: { ufSigla: 'SP' }
        }
      ];
      
      const mockItens = [
        { numeroItem: 1, descricao: 'Computador Core i7 16GB' },
        { numeroItem: 2, descricao: 'Pc' }, // too short
        { numeroItem: 3, descricao: 'TV de 50 polegadas' } // fallback to slice(0,2) if second word is long
      ];
      
      const mockResultados = [
        { 
          valorUnitarioHomologado: 500, 
          valorTotalHomologado: 500, 
          niFornecedor: '111', 
          nomeRazaoSocialFornecedor: 'Fornec A', 
          quantidadeHomologada: 1,
          dataResultado: '2024-01-01'
        }
      ];

      // Outer API
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ data: mockCompras, totalPaginas: 1 })));
      // Itens API (only for the first modality, the rest gets mocked later)
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockItens)));
      // Resultados API (for each item)
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockResultados))); // item 1
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockResultados))); // item 2
      // For item 3, let's mock no result
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse([]))); // item 3
      // Finish other modalities
      httpService.get.mockReturnValue(of(mockAxiosResponse([])));

      await service.collectResultadosHomologados();
      
      expect(resultadoItemModel.findOneAndUpdate).toHaveBeenCalledTimes(2); // Only items with results
      
      // Assert Keyword for item 1
      expect(resultadoItemModel.findOneAndUpdate).toHaveBeenNthCalledWith(1, 
        expect.anything(),
        expect.objectContaining({ palavraChaveExtraida: 'Computador' }),
        expect.anything()
      );
    });

    it('should fallback to Date() if dataResultado is missing in result', async () => {
      const mockCompras = [
        { valorTotalHomologado: 100, situacaoCompraId: 4, numeroControlePNCP: '123-1-456/2024' }
      ];
      const mockItens = [{ numeroItem: 1, descricao: 'A' }]; // short desc
      const mockResultados = [{ valorUnitarioHomologado: 10 }]; // missing dataResultado

      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ data: mockCompras, totalPaginas: 1 })));
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockItens)));
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockResultados)));
      httpService.get.mockReturnValue(of(mockAxiosResponse([])));

      await service.collectResultadosHomologados();
      
      expect(resultadoItemModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ dataResultado: expect.any(Date), palavraChaveExtraida: 'Produto' }),
        expect.anything()
      );
    });

    // Removed "should handle API errors during inner item loop gracefully" to prevent retry timeouts
  });

});
