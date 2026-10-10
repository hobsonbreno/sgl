/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PncpClientService } from './pncp-client.service';
import { HttpService } from '@nestjs/axios';
import { throwError, Observable } from 'rxjs';
import { AxiosError } from 'axios';

describe('PncpClientService', () => {
  let service: PncpClientService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PncpClientService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<PncpClientService>(PncpClientService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function createAxiosError(status: number): AxiosError {
    const error: any = new Error(`Request failed with status code ${status}`);
    error.isAxiosError = true;
    error.response = { status };
    return error as AxiosError;
  }

  it('a) deve esgotar tentativas sem vazar slots', async () => {
    httpService.get.mockReturnValue(throwError(() => createAxiosError(500)));

    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        service.buscarContratacaoEspecifica('00', '2024', '1').catch((e) => e),
      );
    }

    // Avançar os timers para passar as tentativas (5 tentativas) e delays
    // Math.pow(2, tentativa - 1) * 10000 = 10s, 20s, 40s, 60s
    for (let i = 0; i < 30; i++) {
      await jest.advanceTimersByTimeAsync(60000);
      await Promise.resolve(); // flush microtasks
    }

    const results = await Promise.all(promises);
    expect(results[0]).toBeInstanceOf(Error);

    // Validando activeRequests == 0
    expect((service as any).activeRequests).toBe(0);
    expect((service as any).backgroundRequests).toBe(0);

    // Para 6 requests e 5 tentativas cada
    expect(httpService.get).toHaveBeenCalledTimes(30);
  });

  it('b) requisição 404 devolve null e libera slot sem retentar', async () => {
    httpService.get.mockReturnValue(throwError(() => createAxiosError(404)));

    const resultPromise = service.buscarContratacaoEspecifica(
      '00',
      '2024',
      '1',
    );
    await jest.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(result).toBeNull();
    expect(httpService.get).toHaveBeenCalledTimes(1);
    expect((service as any).activeRequests).toBe(0);
  });

  it('c) requisições background respeitam limite de 2 slots simultâneos', async () => {
    jest.useRealTimers();

    httpService.get.mockImplementation(() => {
      return new Observable((subscriber) => {
        setTimeout(() => {
          subscriber.next({ data: [] });
          subscriber.complete();
        }, 100); // 100ms real delay
      }) as any;
    });

    const bgPromises = [];
    bgPromises.push(service.buscarResultadosDoItem('00-1-1/2024', 1));
    bgPromises.push(service.buscarResultadosDoItem('00-1-1/2024', 1));
    bgPromises.push(service.buscarResultadosDoItem('00-1-1/2024', 1));

    // Atraso real para dar tempo do event loop rodar os await waitForCapacity
    await new Promise((res) => setTimeout(res, 20));

    expect((service as any).activeRequests).toBe(2);
    expect((service as any).backgroundRequests).toBe(2);

    const fgPromises = [];
    const mockFiltro = {
      dataInicial: '20240101',
      dataFinal: '20240101',
      codigoModalidadeContratacao: 1,
    };
    fgPromises.push(service.buscarContratacoesComPropostaAberta(mockFiltro));
    fgPromises.push(service.buscarContratacoesComPropostaAberta(mockFiltro));
    fgPromises.push(service.buscarContratacoesComPropostaAberta(mockFiltro));

    await new Promise((res) => setTimeout(res, 20));

    expect((service as any).activeRequests).toBe(5);

    await Promise.allSettled([...bgPromises, ...fgPromises]);

    expect((service as any).activeRequests).toBe(0);
    expect((service as any).backgroundRequests).toBe(0);

    jest.useFakeTimers();
  });

  it('d) 400 não é retentado (apenas 1 chamada)', async () => {
    httpService.get.mockReturnValue(throwError(() => createAxiosError(400)));

    let error;
    try {
      const p = service.buscarContratacaoEspecifica('00', '2024', '1');
      p.catch(() => {});
      await jest.advanceTimersByTimeAsync(1000);
      await p;
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(httpService.get).toHaveBeenCalledTimes(1);
    expect((service as any).activeRequests).toBe(0);
  });
});
