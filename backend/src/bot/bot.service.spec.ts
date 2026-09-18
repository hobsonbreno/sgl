import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { getModelToken } from '@nestjs/mongoose';
import { BotExecucao } from './bot-execucao.schema';
import { PerfilBusca } from '../perfil-busca/perfil-busca.schema';
import { Oportunidade } from '../oportunidade/oportunidade.schema';
import { Orgao } from '../orgao/orgao.schema';
import { Produto } from '../produto/produto.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { EventsService } from '../events/events.service';
import { SyncFailureLoggerService } from '../observability/sync-failure-logger.service';
import { SystemLogService } from '../observability/system-log/system-log.service';
import { OportunidadeGateway } from '../oportunidade/oportunidade.gateway';
import { CronJob } from 'cron';

jest.useFakeTimers();

describe('BotService', () => {
  let service: BotService;
  let mockBotExecucaoModel: any;
  let mockPerfilBuscaModel: any;
  let mockOportunidadeModel: any;
  let mockOrgaoModel: any;
  let mockPncpClientService: any;
  let mockSchedulerRegistry: any;
  let mockConfigService: any;
  let mockEventsService: any;
  let mockSyncFailureLogger: any;
  let mockSystemLogService: any;
  let mockOportunidadeGateway: any;

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
      countDocuments: jest.fn(),
    });

    mockBotExecucaoModel = createMockModel();
    mockPerfilBuscaModel = createMockModel();
    mockOportunidadeModel = createMockModel();
    mockOrgaoModel = createMockModel();
    const mockProdutoModel = createMockModel();

    mockPncpClientService = {
      buscarContratacoesPorData: jest.fn(),
      buscarContratacoesComPropostaAberta: jest.fn().mockResolvedValue([]),
      buscarItensDaContratacao: jest.fn().mockResolvedValue([]),
    };

    const mockJobsMap = new Map();
    mockSchedulerRegistry = {
      addCronJob: jest.fn(),
      getCronJobs: jest.fn().mockReturnValue(mockJobsMap),
      doesExist: jest.fn().mockReturnValue(false),
      deleteCronJob: jest.fn(),
    };

    mockConfigService = {
      getConfiguracao: jest.fn().mockResolvedValue({ horariosBuscaBot: ['08:00'] }),
      setUltimaExecucao: jest.fn().mockResolvedValue(true),
    };

    mockEventsService = {
      emit: jest.fn(),
      emitDashboardUpdate: jest.fn(),
    };

    mockSyncFailureLogger = {
      registrarFalha: jest.fn(),
    };

    mockSystemLogService = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn(),
    };

    mockOportunidadeGateway = {
      emitOportunidadeUpdate: jest.fn(),
      emitBotExecutionUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: getModelToken(BotExecucao.name), useValue: mockBotExecucaoModel },
        { provide: getModelToken(PerfilBusca.name), useValue: mockPerfilBuscaModel },
        { provide: getModelToken(Oportunidade.name), useValue: mockOportunidadeModel },
        { provide: getModelToken(Orgao.name), useValue: mockOrgaoModel },
        { provide: getModelToken(Produto.name), useValue: mockProdutoModel },
        { provide: PncpClientService, useValue: mockPncpClientService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: ConfiguracaoService, useValue: mockConfigService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: SyncFailureLoggerService, useValue: mockSyncFailureLogger },
        { provide: SystemLogService, useValue: mockSystemLogService },
        { provide: OportunidadeGateway, useValue: mockOportunidadeGateway },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should register crons and run boot check if it has not run today', async () => {
      const spyRegistrarCron = jest.spyOn(service, 'registrarCronDinamicoMultiplos');
      const spyExecutarBusca = jest.spyOn(service, 'executarBuscaDiaria').mockResolvedValueOnce([] as any);

      mockConfigService.getConfiguracao.mockResolvedValueOnce({
        horariosBuscaBot: ['10:00'],
        ultimaExecucaoAutomaticaData: '2000-01-01',
      });

      await service.onApplicationBootstrap();
      expect(spyRegistrarCron).toHaveBeenCalledWith(['10:00']);
      
      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(spyExecutarBusca).toHaveBeenCalledWith(true);
    });
    
    it('should register crons and skip boot check if it has run today', async () => {
      const spyExecutarBusca = jest.spyOn(service, 'executarBuscaDiaria');
      const hojeDate = new Date();
      const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
      
      mockConfigService.getConfiguracao.mockResolvedValueOnce({
        horariosBuscaBot: ['10:00'],
      }).mockResolvedValueOnce({
        ultimaExecucaoAutomaticaData: dataHoje,
      });

      await service.onApplicationBootstrap();
      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(spyExecutarBusca).not.toHaveBeenCalled();
    });

    it('should handle missing config and fallback to default schedules', async () => {
      const spyRegistrarCron = jest.spyOn(service, 'registrarCronDinamicoMultiplos');
      mockConfigService.getConfiguracao.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await service.onApplicationBootstrap();
      expect(spyRegistrarCron).toHaveBeenCalledWith(['08:00', '12:00', '18:00']);

      jest.runAllTimers();
      await new Promise(process.nextTick);
    });

    it('should log error if boot recovery fails (Error obj)', async () => {
      mockConfigService.getConfiguracao.mockRejectedValueOnce(new Error('boot db error'));
      await service.onApplicationBootstrap();
      jest.runAllTimers();
      await new Promise(process.nextTick);
      expect(mockSystemLogService.logError).toHaveBeenCalled();
    });
    
    it('should log error if boot recovery fails (String)', async () => {
      mockConfigService.getConfiguracao.mockRejectedValueOnce('boot db error string');
      await service.onApplicationBootstrap();
      jest.runAllTimers();
      await new Promise(process.nextTick);
      expect(mockSystemLogService.logError).toHaveBeenCalled();
    });
  });

  describe('registrarCronDinamicoMultiplos', () => {
    it('should delete old crons and add new ones', () => {
      mockSchedulerRegistry.doesExist.mockReturnValue(true);
      const mockJobsMap = new Map();
      mockJobsMap.set('botBuscaDiaria_0', {});
      mockJobsMap.set('otherJob', {});
      mockSchedulerRegistry.getCronJobs.mockReturnValue(mockJobsMap);

      service.registrarCronDinamicoMultiplos(['14:30']);

      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith('botBuscaDiaria');
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith('botBuscaDiaria_0');
      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalledWith('otherJob');
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
      
      // Simulate cron job fire
      const addedJobCall = mockSchedulerRegistry.addCronJob.mock.calls[0];
      const cronJob = addedJobCall[1] as CronJob;
      const spyExecutar = jest.spyOn(service, 'executarBuscaDiaria').mockResolvedValueOnce([] as any);
      // Access private cron callback
      (cronJob as any)._callbacks[0]();
      expect(spyExecutar).toHaveBeenCalledWith(true);
    });
  });

  describe('isExecucao', () => {
    it('should return current status', () => {
      expect(service.isExecucao()).toBe(false);
    });
  });

  describe('executarBuscaDiaria', () => {
    it('should prevent concurrent execution', async () => {
      (service as any).emExecucao = true;
      const result = await service.executarBuscaDiaria();
      expect(result).toEqual({ message: 'Bot já está em execução.' });
    });

    const getMockPncpResult = (overrides = {}) => ({
      numeroControlePNCP: '123',
      usuarioNome: 'Compras.gov.br',
      orgaoEntidade: { cnpj: '111', razaoSocial: 'Orgao 1' },
      unidadeOrgao: { codigoIbge: '222', codigoUnidade: '333' },
      ...overrides
    });

    const getMockPerfil = (overrides = {}) => ({
      _id: '123',
      nome: 'TI',
      modalidades: [1],
      ufs: [],
      ativo: true,
      ...overrides
    });

    it('should execute full flow successfully and save missing Orgao', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ ufs: ['CE'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      mockOportunidadeModel.findOne.mockResolvedValueOnce(null);
      mockOportunidadeModel.create.mockResolvedValueOnce({ _id: 'op1' });
      mockOrgaoModel.findOne.mockResolvedValueOnce(null); // Orgao não existe
      
      const result = await service.executarBuscaDiaria(true);
      
      expect(mockEventsService.emitDashboardUpdate).toHaveBeenCalled();
      expect(mockOportunidadeModel.create).toHaveBeenCalled();
      expect(mockOrgaoModel.create).toHaveBeenCalled();
      expect(mockBotExecucaoModel.create).toHaveBeenCalled();
      expect(mockConfigService.setUltimaExecucao).toHaveBeenCalled();
      expect(mockOportunidadeGateway.emitBotExecutionUpdated).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });

    it('should update existing Oportunidade and skip Orgao creation if exists', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      mockOportunidadeModel.findOne.mockResolvedValueOnce({ _id: 'existente' }); // Oportunidade existe
      mockOrgaoModel.findOne.mockResolvedValueOnce({ _id: 'orgao' }); // Orgao existe
      
      await service.executarBuscaDiaria();
      
      expect(mockOportunidadeModel.updateOne).toHaveBeenCalled();
      expect(mockOrgaoModel.create).not.toHaveBeenCalled();
    });

    it('should filter out mismatched Ibge', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ municipiosIbge: ['999'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      await service.executarBuscaDiaria();
      expect(mockOportunidadeModel.findOne).not.toHaveBeenCalled(); // Skipped
    });

    it('should filter out mismatched Cnpj', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ orgaosCnpj: ['999'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      await service.executarBuscaDiaria();
      expect(mockOportunidadeModel.findOne).not.toHaveBeenCalled(); // Skipped
    });

    it('should filter out mismatched Uasg', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ unidadesUasg: ['999'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      await service.executarBuscaDiaria();
      expect(mockOportunidadeModel.findOne).not.toHaveBeenCalled(); // Skipped
    });
    
    it('should filter out invalid portal (usuarioNome)', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult({ usuarioNome: 'Portal Pago Invalido' })]);
      await service.executarBuscaDiaria();
      expect(mockOportunidadeModel.findOne).not.toHaveBeenCalled(); // Skipped
    });

    it('should match keywords in title', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ palavrasChave: ['laptop'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult({ objetoCompra: 'aquisição de laptop novo' })]);
      mockOportunidadeModel.findOne.mockResolvedValueOnce(null);
      
      await service.executarBuscaDiaria();
      expect(mockOportunidadeModel.create).toHaveBeenCalled();
    });

    it('should match keywords via deep search when title fails', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ palavrasChave: ['laptop'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult({ objetoCompra: 'equipamentos de informatica' })]);
      mockPncpClientService.buscarItensDaContratacao.mockResolvedValueOnce([{ descricao: 'um ótimo lÁptop' }]);
      mockOportunidadeModel.findOne.mockResolvedValueOnce(null);
      
      await service.executarBuscaDiaria();
      expect(mockPncpClientService.buscarItensDaContratacao).toHaveBeenCalled();
      expect(mockOportunidadeModel.create).toHaveBeenCalled();
    });

    it('should skip if deep search also fails to find keyword', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ palavrasChave: ['laptop'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult({ objetoCompra: 'equipamentos de informatica' })]);
      mockPncpClientService.buscarItensDaContratacao.mockResolvedValueOnce([{ descricao: 'mouse e teclado' }]);
      
      await service.executarBuscaDiaria();
      expect(mockPncpClientService.buscarItensDaContratacao).toHaveBeenCalled();
      expect(mockOportunidadeModel.create).not.toHaveBeenCalled();
    });

    it('should catch error in deep search but continue execution', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil({ palavrasChave: ['laptop'] })]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult({ objetoCompra: 'equipamentos' })]);
      mockPncpClientService.buscarItensDaContratacao.mockRejectedValueOnce(new Error('API rate limit'));
      
      await service.executarBuscaDiaria();
      expect(mockSystemLogService.logWarn).toHaveBeenCalled();
      expect(mockOportunidadeModel.create).not.toHaveBeenCalled();
    });

    it('should register failure in sync logger when item processing throws Error object', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      mockOportunidadeModel.findOne.mockRejectedValueOnce(new Error('DB Error'));
      
      await service.executarBuscaDiaria();
      expect(mockSyncFailureLogger.registrarFalha).toHaveBeenCalled();
    });

    it('should register failure in sync logger when item processing throws String', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValueOnce([getMockPncpResult()]);
      mockOportunidadeModel.findOne.mockRejectedValueOnce('DB Error String');
      
      await service.executarBuscaDiaria();
      expect(mockSyncFailureLogger.registrarFalha).toHaveBeenCalled();
    });

    it('should log error when PNCP modalidade search throws Error obj', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockRejectedValueOnce(new Error('Network error'));
      
      await service.executarBuscaDiaria();
      expect(mockSystemLogService.logError).toHaveBeenCalled();
    });
    
    it('should log error when PNCP modalidade search throws String', async () => {
      mockPerfilBuscaModel.find.mockResolvedValueOnce([getMockPerfil()]);
      mockPncpClientService.buscarContratacoesComPropostaAberta.mockRejectedValueOnce('Network error string');
      
      await service.executarBuscaDiaria();
      expect(mockSystemLogService.logError).toHaveBeenCalled();
    });
  });
});
