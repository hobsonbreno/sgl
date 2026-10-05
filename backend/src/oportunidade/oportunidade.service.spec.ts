import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { getLoggerToken } from 'nestjs-pino';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { OportunidadeGateway } from './oportunidade.gateway';
import { SefazCeScraperService } from '../sefaz-ce/sefaz-ce-scraper.service';
import { CategoriaService } from '../categoria/categoria.service';
import { SystemLogService } from '../observability/system-log/system-log.service';

jest.mock('puppeteer-core', () => ({}));
jest.mock('../sefaz-ce/sefaz-ce-scraper.service');
import { OportunidadeService } from './oportunidade.service';
import { Oportunidade } from './oportunidade.schema';
import { Produto } from '../produto/produto.schema';
import { SimulacaoEstrategia } from './schemas/simulacao.schema';
import { Cotacao } from '../cotacao/cotacao.schema';

describe('OportunidadeService - Sincronizacao Lock', () => {
  let service: OportunidadeService;

  const mockModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    find: jest.fn().mockReturnThis(),
    countDocuments: jest.fn().mockReturnThis(),
  };

  const mockGateway = {
    server: {
      emit: jest.fn(),
    },
    emitOportunidadeUpdate: jest.fn(),
    emitOportunidadeDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OportunidadeService,
        { provide: getLoggerToken(OportunidadeService.name), useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: getModelToken(Oportunidade.name), useValue: mockModel },
        { provide: PncpClientService, useValue: { buscarItensDaContratacao: jest.fn().mockResolvedValue([]) } },
        { provide: getModelToken(Produto.name), useValue: { find: jest.fn().mockResolvedValue([]), deleteMany: jest.fn(), insertMany: jest.fn(), updateOne: jest.fn() } },
        { provide: getModelToken(SimulacaoEstrategia.name), useValue: {} },
        { provide: FinanceiroService, useValue: {} },
        { provide: getModelToken(Cotacao.name), useValue: {} },
        { provide: OportunidadeGateway, useValue: mockGateway },
        { provide: SefazCeScraperService, useValue: {} },
        { provide: CategoriaService, useValue: { categorizeProduto: jest.fn() } },
        { provide: SystemLogService, useValue: { logError: jest.fn(), logWarn: jest.fn() } },
      ],
    }).compile();

    service = module.get<OportunidadeService>(OportunidadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar erro 202 (ja_em_andamento) na segunda chamada simultânea', async () => {
    mockModel.exec.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ _id: '1', numeroControlePNCP: '123' }), 50)));
    
    // Inicia a primeira chamada
    const p1 = service.sincronizarItens('1');
    
    // Inicia a segunda chamada imediatamente, deve falhar
    await expect(service.sincronizarItens('1')).rejects.toThrow(HttpException);
    
    try {
      await service.sincronizarItens('1');
    } catch (e: any) {
      expect(e.getStatus()).toBe(202);
      expect(e.getResponse().status).toBe('ja_em_andamento');
    }

    await p1; // Aguarda a primeira terminar a parte síncrona
  });

  it('deve liberar a trava em caso de erro na busca da oportunidade', async () => {
    mockModel.exec.mockRejectedValueOnce(new Error('DB Error'));
    
    await expect(service.sincronizarItens('2')).rejects.toThrow('DB Error');
    
    // Como a trava foi liberada, a próxima chamada não deve dar erro de "ja_em_andamento"
    mockModel.exec.mockResolvedValueOnce({ _id: '2', numeroControlePNCP: '123' });
    const result = await service.sincronizarItens('2');
    expect(result.message).toContain('iniciada em background');
  });
});
