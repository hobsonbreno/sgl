import { Test, TestingModule } from '@nestjs/testing';
import { OportunidadeService } from './oportunidade.service';
import { getModelToken } from '@nestjs/mongoose';
import { Oportunidade } from './oportunidade.schema';
import { Produto } from '../produto/produto.schema';
import { SimulacaoEstrategia } from './schemas/simulacao.schema';
import { Cotacao } from '../cotacao/cotacao.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { OportunidadeGateway } from './oportunidade.gateway';
import { SefazCeScraperService } from '../sefaz-ce/sefaz-ce-scraper.service';
import { CategoriaService } from '../categoria/categoria.service';
import { SystemLogService } from '../observability/system-log/system-log.service';
import { PinoLogger, getLoggerToken } from 'nestjs-pino';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OportunidadeService', () => {
  let service: OportunidadeService;
  let mockOportunidadeModel: any;
  let mockProdutoModel: any;
  let mockSimulacaoModel: any;
  let mockCotacaoModel: any;
  let mockPncpClientService: any;
  let mockFinanceiroService: any;
  let mockGateway: any;
  let mockSefazScraperService: any;
  let mockCategoriaService: any;
  let mockSystemLogService: any;
  let mockPinoLogger: any;

  beforeEach(async () => {
    const createMockModel = () => ({
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
    });

    mockOportunidadeModel = createMockModel();
    mockProdutoModel = createMockModel();
    
    mockSimulacaoModel = class MockSimulacaoModel {
      constructor(public data: any) {}
      save = jest.fn().mockResolvedValue({ _id: 'sim_1' });
    };

    mockCotacaoModel = createMockModel();

    mockPncpClientService = {
      buscarItensDaContratacao: jest.fn(),
      buscarEditalPorLinkOuControle: jest.fn(),
      buscarContratacaoPorUrlOuControle: jest.fn(),
      buscarResultadosDoItem: jest.fn(),
    };

    mockFinanceiroService = {
      calcularImpostosSefaz: jest.fn(),
      obterRBT12Atual: jest.fn(),
      calcularAliquotaEfetiva: jest.fn(),
    };

    mockGateway = {
      emitOportunidadeUpdate: jest.fn(),
      emitOportunidadeDelete: jest.fn(),
    };

    mockSefazScraperService = {
      consultarNcm: jest.fn(),
      formatarCoepParaPesquisa: jest.fn(),
      buscarStatusCotacaoSefaz: jest.fn(),
    };

    mockCategoriaService = {
      definirCategoriaAutomaticamente: jest.fn(),
      categorizeProduto: jest.fn(),
    };

    mockSystemLogService = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn(),
    };

    mockPinoLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OportunidadeService,
        { provide: getLoggerToken(OportunidadeService.name), useValue: mockPinoLogger },
        { provide: PinoLogger, useValue: mockPinoLogger },
        { provide: getModelToken(Oportunidade.name), useValue: mockOportunidadeModel },
        { provide: getModelToken(Produto.name), useValue: mockProdutoModel },
        { provide: getModelToken(SimulacaoEstrategia.name), useValue: mockSimulacaoModel },
        { provide: getModelToken(Cotacao.name), useValue: mockCotacaoModel },
        { provide: PncpClientService, useValue: mockPncpClientService },
        { provide: FinanceiroService, useValue: mockFinanceiroService },
        { provide: OportunidadeGateway, useValue: mockGateway },
        { provide: SefazCeScraperService, useValue: mockSefazScraperService },
        { provide: CategoriaService, useValue: mockCategoriaService },
        { provide: SystemLogService, useValue: mockSystemLogService },
      ],
    }).compile();

    service = module.get<OportunidadeService>(OportunidadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should query with filters and pagination', async () => {
      mockOportunidadeModel.find().exec.mockResolvedValueOnce([{ _id: '1' }]);
      mockOportunidadeModel.countDocuments().exec.mockResolvedValueOnce(1);

      const query = { kanbanStatus: 'novo', uf: 'CE', modalidadeCodigo: 1, limit: 10, page: 2 };
      const result = await service.findAll(query);
      
      expect(mockOportunidadeModel.find).toHaveBeenCalled();
      expect(mockOportunidadeModel.countDocuments).toHaveBeenCalled();
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate prazoAteEmDias filter correctly', async () => {
      mockOportunidadeModel.find().exec.mockResolvedValueOnce([]);
      mockOportunidadeModel.countDocuments().exec.mockResolvedValueOnce(0);

      const query = { prazoAteEmDias: 5 };
      await service.findAll(query);
      
      expect(mockOportunidadeModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return populated oportunidade if found', async () => {
      const mockOportunidade = { _id: '1', nome: 'Teste' };
      const mockExec = jest.fn().mockResolvedValueOnce(mockOportunidade);
      mockOportunidadeModel.findById.mockReturnValue({ exec: mockExec });

      const result = await service.findOne('1');
      expect(mockOportunidadeModel.findById).toHaveBeenCalledWith('1');
      expect(result.nome).toEqual('Teste');
    });

    it('should throw NotFoundException if not found', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockOportunidadeModel.findById.mockReturnValue({ exec: mockExec });

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update status and emit gateway event', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce({ _id: '1', kanbanStatus: 'novo' });
      mockOportunidadeModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const result = await service.updateStatus('1', 'novo');
      expect(mockOportunidadeModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockGateway.emitOportunidadeUpdate).toHaveBeenCalledWith({ _id: '1', kanbanStatus: 'novo' });
      expect(result.kanbanStatus).toBe('novo');
    });

    it('should throw NotFoundException if not found during update', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockOportunidadeModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      await expect(service.updateStatus('1', 'novo')).rejects.toThrow(NotFoundException);
    });
  });

  describe('marcarVisualizado', () => {
    it('should mark as visualizado and emit gateway event', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce({ _id: '1', visualizado: true });
      mockOportunidadeModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const result = await service.marcarVisualizado('1');
      expect(mockOportunidadeModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockGateway.emitOportunidadeUpdate).toHaveBeenCalled();
      expect(result.visualizado).toBe(true);
    });

    it('should throw NotFoundException if not found during visualizado update', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockOportunidadeModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      await expect(service.marcarVisualizado('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete oportunidade and related items', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce({ _id: '1' });
      mockOportunidadeModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });
      mockProdutoModel.deleteMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const result = await service.remove('1');
      
      expect(mockOportunidadeModel.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(mockProdutoModel.deleteMany).toHaveBeenCalledWith({ oportunidadeId: '1' });
      expect(mockGateway.emitOportunidadeDelete).toHaveBeenCalledWith('1');
      expect(result.message).toContain('removida');
    });

    it('should throw NotFoundException if not found', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockOportunidadeModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sincronizarItens', () => {
    it('should trigger background sync if valid', async () => {
      const mockOportunidade = { _id: '1', numeroControlePNCP: '123' };
      const mockExec = jest.fn().mockResolvedValueOnce(mockOportunidade);
      mockOportunidadeModel.findById.mockReturnValue({ exec: mockExec });

      jest.spyOn(service as any, 'executarSincronizacaoCompletaBackground').mockResolvedValue(undefined);

      const result = await service.sincronizarItens('1');
      expect(result.message).toContain('background');
    });

    it('should throw NotFoundException if not found', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockOportunidadeModel.findById.mockReturnValue({ exec: mockExec });

      await expect(service.sincronizarItens('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no PNCP control number', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce({ _id: '1', numeroControlePNCP: null });
      mockOportunidadeModel.findById.mockReturnValue({ exec: mockExec });

      await expect(service.sincronizarItens('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('executarSincronizacaoCompletaBackground', () => {
    it('should handle empty items array from PNCP', async () => {
      mockPncpClientService.buscarItensDaContratacao.mockResolvedValueOnce([]);
      
      await (service as any).executarSincronizacaoCompletaBackground('1', { numeroControlePNCP: '123' });
      expect(mockSystemLogService.logWarn).toHaveBeenCalled();
    });

    it('should sync and fetch sefaz if Ceara', async () => {
      const mockItem = {
        numeroItem: 1,
        descricao: 'Teste',
        valorTotal: 100
      };
      mockPncpClientService.buscarItensDaContratacao.mockResolvedValueOnce([mockItem]);
      mockProdutoModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockSefazScraperService.formatarCoepParaPesquisa.mockReturnValue('coep');
      mockSefazScraperService.buscarStatusCotacaoSefaz.mockResolvedValue('FINALIZADA');
      mockProdutoModel.deleteMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockProdutoModel.insertMany.mockResolvedValue({});

      await (service as any).executarSincronizacaoCompletaBackground('1', { 
        numeroControlePNCP: '123',
        orgaoNome: 'Tribunal de Justiça do Ceará'
      });

      expect(mockProdutoModel.insertMany).toHaveBeenCalled();
    });
  });

  describe('simularEstrategia', () => {
    it('should calculate and save simulation with Profit', async () => {
      mockFinanceiroService.obterRBT12Atual.mockResolvedValueOnce(100000);
      mockFinanceiroService.calcularAliquotaEfetiva.mockReturnValue(0.05);
      
      const mockCotacao = {
        itens: [{ melhorPreco: { precoUnitario: 50 }, quantidade: 2 }] // Custo = 100
      };
      const mockExec = jest.fn().mockResolvedValueOnce(mockCotacao);
      mockCotacaoModel.findOne.mockReturnValue({ exec: mockExec });

      const dto = {
        oportunidadeId: '1',
        lanceTotal: 1000,
        modeloEntrega: 'FRACIONADO',
        mesesContrato: 2
      };

      const result = await service.simularEstrategia(dto as any);
      
      expect(result.statusOperacao).toBe('LUCRO');
      expect(result.custoTotal).toBe(100);
      expect(result.impostosTotal).toBe(50); // 1000 * 0.05
    });

    it('should calculate and save simulation with Prejuizo Critico', async () => {
      mockFinanceiroService.obterRBT12Atual.mockResolvedValueOnce(100000);
      mockFinanceiroService.calcularAliquotaEfetiva.mockReturnValue(0.20);
      
      const mockCotacao = {
        itens: [{ melhorPreco: { precoUnitario: 900 }, quantidade: 1 }] // Custo = 900
      };
      const mockExec = jest.fn().mockResolvedValueOnce(mockCotacao);
      mockCotacaoModel.findOne.mockReturnValue({ exec: mockExec });

      const dto = {
        oportunidadeId: '1',
        lanceTotal: 1000,
        modeloEntrega: 'UNICO',
      };

      const result = await service.simularEstrategia(dto as any);
      
      expect(result.statusOperacao).toBe('PREJUIZO_CRITICO');
      expect(mockPinoLogger.warn).toHaveBeenCalled();
    });

    it('should throw Error if Cotacao not found', async () => {
      const mockExec = jest.fn().mockResolvedValueOnce(null);
      mockCotacaoModel.findOne.mockReturnValue({ exec: mockExec });

      await expect(service.simularEstrategia({ oportunidadeId: '1' } as any)).rejects.toThrow('Cotação base não localizada.');
    });
  });

  describe('syncAllActiveOpportunities', () => {
    it('should call sincronizarItens for all active ops', async () => {
      const mockOps = [{ _id: '1', numeroControlePNCP: '123' }, { _id: '2', numeroControlePNCP: null }];
      mockOportunidadeModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(mockOps) });
      
      const spySync = jest.spyOn(service, 'sincronizarItens').mockResolvedValueOnce({} as any);

      await service.syncAllActiveOpportunities();
      
      expect(spySync).toHaveBeenCalledWith('1');
      expect(spySync).toHaveBeenCalledTimes(1); // Skipped op without PNCP
    });

    it('should log warning if sync fails for one item', async () => {
      const mockOps = [{ _id: '1', numeroControlePNCP: '123' }];
      mockOportunidadeModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(mockOps) });
      
      jest.spyOn(service, 'sincronizarItens').mockRejectedValueOnce(new Error('Sync error'));

      await service.syncAllActiveOpportunities();
      expect(mockPinoLogger.warn).toHaveBeenCalled();
    });
    
    it('should handle general exception', async () => {
      mockOportunidadeModel.find.mockReturnValue({ exec: jest.fn().mockRejectedValueOnce(new Error('DB Error')) });
      await service.syncAllActiveOpportunities();
      expect(mockPinoLogger.error).toHaveBeenCalled();
    });
  });

  describe('importarManual', () => {
    it('should import and save new Oportunidade', async () => {
      const mockPncpResult = {
        numeroControlePNCP: '123',
        dataPublicacaoPncp: '2023-01-01',
        dataEncerramentoProposta: '2023-12-01',
        dataAtualizacaoPNCP: '2023-01-01',
        orgaoEntidade: { cnpj: '111', razaoSocial: 'Orgao 1' },
        unidadeOrgao: { codigoUnidade: '222' }
      };
      mockPncpClientService.buscarContratacaoPorUrlOuControle.mockResolvedValueOnce(mockPncpResult);
      mockOportunidadeModel.findOne.mockResolvedValueOnce(null);
      mockOportunidadeModel.create.mockResolvedValueOnce({ _id: 'op1' });

      const result = await service.importarManual('123');
      expect(result).toBeDefined();
      expect(mockGateway.emitOportunidadeUpdate).toHaveBeenCalled();
    });

    it('should update existing Oportunidade instead of create', async () => {
      const mockPncpResult = {
        numeroControlePNCP: '123',
        orgaoEntidade: { cnpj: '111', razaoSocial: 'Orgao 1' },
        unidadeOrgao: { codigoUnidade: '222' }
      };
      mockPncpClientService.buscarContratacaoPorUrlOuControle.mockResolvedValueOnce(mockPncpResult);
      mockOportunidadeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce({ _id: 'op1' }) });
      mockOportunidadeModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce({ _id: 'op1', kanbanStatus: 'FAZENDO' }) });

      const result = await service.importarManual('123');
      expect(mockOportunidadeModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequest if PNCP API returns null', async () => {
      mockPncpClientService.buscarContratacaoPorUrlOuControle.mockResolvedValueOnce(null);
      await expect(service.importarManual('123')).rejects.toThrow();
    });

    it('should catch error and throw BadRequest', async () => {
      mockPncpClientService.buscarContratacaoPorUrlOuControle.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.importarManual('123')).rejects.toThrow('Erro ao importar oportunidade: Network error');
    });
  });
});

