import { Test, TestingModule } from '@nestjs/testing';
import { PncpClientService } from './pncp-client.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError, timer } from 'rxjs';
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

describe('PncpClientService', () => {
  let service: PncpClientService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const httpServiceMock = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PncpClientService,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    service = module.get<PncpClientService>(PncpClientService);
    httpService = module.get(HttpService);
    
    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAxiosResponse = (data: any, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() } as any,
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

  describe('buscarContratacoesComPropostaAberta', () => {
    it('should paginate through results correctly', async () => {
      // Setup mock para retornar 2 páginas
      httpService.get
        .mockReturnValueOnce(of(mockAxiosResponse({ data: [{ id: 1 }], totalPaginas: 2 })))
        .mockReturnValueOnce(of(mockAxiosResponse({ data: [{ id: 2 }], totalPaginas: 2 })));

      const results = await service.buscarContratacoesComPropostaAberta({
        dataInicial: '20240101',
        dataFinal: '20240110',
        codigoModalidadeContratacao: 6,
      });

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it('should break early if no data is returned', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(null)));

      const results = await service.buscarContratacoesComPropostaAberta({
        dataInicial: '20240101',
        dataFinal: '20240110',
        codigoModalidadeContratacao: 6,
      });

      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(0);
    });
  });

  describe('buscarItensDaContratacao', () => {
    it('should return empty array if invalid pncp number', async () => {
      const results = await service.buscarItensDaContratacao('123');
      expect(results).toHaveLength(0);
    });

    it('should return empty array if missing year or sequence', async () => {
      expect(await service.buscarItensDaContratacao('00394494000136-1')).toHaveLength(0);
      expect(await service.buscarItensDaContratacao('00394494000136/2024')).toHaveLength(0);
    });

    it('should fetch items from both APIs and concatenate pages', async () => {
      // Primeira API falha em retornar itens, segunda retorna 1
      httpService.get
        .mockReturnValueOnce(of(mockAxiosResponse([]))) // Consulta (0 itens)
        .mockReturnValueOnce(of(mockAxiosResponse([{ item: 1 }]))); // Integração (1 item)

      const results = await service.buscarItensDaContratacao('00394494000136-1-000616/2024');

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });
    
    it('should paginate items if more than tamanhoPagina', async () => {
      const itemsPage1 = new Array(50).fill({ item: 1 }); // Cheio
      const itemsPage2 = [{ item: 2 }]; // Menos que 50

      httpService.get
        .mockReturnValueOnce(of(mockAxiosResponse(itemsPage1))) // Página 1
        .mockReturnValueOnce(of(mockAxiosResponse(itemsPage2))); // Página 2

      const results = await service.buscarItensDaContratacao('00394494000136-1-000616/2024');

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(51);
    });
  });

  describe('buscarResultadosDoItem', () => {
    it('should return empty array if invalid pncp number', async () => {
      expect(await service.buscarResultadosDoItem('123', 1)).toHaveLength(0);
      expect(await service.buscarResultadosDoItem('00394494000136-1', 1)).toHaveLength(0);
      expect(await service.buscarResultadosDoItem('00394494000136/2024', 1)).toHaveLength(0);
    });

    it('should paginate and return results', async () => {
      const itemsPage1 = new Array(50).fill({ res: 1 });
      const itemsPage2 = [{ res: 2 }];

      httpService.get
        .mockReturnValueOnce(of(mockAxiosResponse(itemsPage1)))
        .mockReturnValueOnce(of(mockAxiosResponse(itemsPage2)));

      const results = await service.buscarResultadosDoItem('00394494000136-1-000616/2024', 1);

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(51);
    });

    it('should return empty array if 404', async () => {
      const err = mockAxiosError(404);
      httpService.get.mockReturnValueOnce(throwError(() => err));

      const results = await service.buscarResultadosDoItem('00394494000136-1-000616/2024', 1);
      expect(results).toHaveLength(0);
    });
  });

  describe('buscarContratacaoEspecifica', () => {
    it('should return contract data', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ uasg: '123' })));
      const res = await service.buscarContratacaoEspecifica('123', '2024', '1');
      expect(res.uasg).toBe('123');
    });
  });

  describe('buscarContratacaoPorUrlOuControle', () => {
    it('should parse URL correctly', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ parsed: true })));
      const result = await service.buscarContratacaoPorUrlOuControle('https://pncp.gov.br/app/editais/00394494000136/2024/616?test=1');
      expect(result.parsed).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(expect.stringContaining('00394494000136/compras/2024/616'), expect.any(Object));
    });

    it('should parse Controle correctly', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse({ parsed: true })));
      const result = await service.buscarContratacaoPorUrlOuControle('00394494000136-1-000616/2024');
      expect(result.parsed).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(expect.stringContaining('00394494000136/compras/2024/000616'), expect.any(Object));
    });

    it('should throw if invalid input', async () => {
      await expect(service.buscarContratacaoPorUrlOuControle('invalid_string')).rejects.toThrow('inválido');
    });
  });
});
