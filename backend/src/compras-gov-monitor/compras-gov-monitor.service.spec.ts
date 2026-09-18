import { Test, TestingModule } from '@nestjs/testing';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import { EventsService } from '../events/events.service';
import { SystemLogService } from '../observability/system-log/system-log.service';
import { getModelToken } from '@nestjs/mongoose';
import { Proposta } from '../proposta/proposta.schema';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('ComprasGovMonitorService', () => {
  let service: ComprasGovMonitorService;
  let scraperService: jest.Mocked<ComprasGovScraperService>;
  let eventsService: jest.Mocked<EventsService>;
  let systemLogService: jest.Mocked<SystemLogService>;

  beforeEach(async () => {
    const scraperServiceMock = {
      scrapeMinhasParticipacoes: jest.fn(),
    };
    const eventsServiceMock = {
      emitirMonitoramentoConcluido: jest.fn(),
      emitirAlertaRadar: jest.fn(),
      emitirAlertaMonitoramento: jest.fn(),
    };
    const systemLogServiceMock = {
      logError: jest.fn(),
    };
    const propostaModelMock = {};

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    // Default mock behavior for fs
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasGovMonitorService,
        {
          provide: ComprasGovScraperService,
          useValue: scraperServiceMock,
        },
        { provide: EventsService, useValue: eventsServiceMock },
        { provide: SystemLogService, useValue: systemLogServiceMock },
        { provide: getModelToken(Proposta.name), useValue: propostaModelMock },
      ],
    }).compile();

    service = module.get<ComprasGovMonitorService>(ComprasGovMonitorService);
    scraperService = module.get(ComprasGovScraperService);
    eventsService = module.get(EventsService);
    systemLogService = module.get(SystemLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cache loading', () => {
    it('should handle fs.readFileSync error gracefully', async () => {
      // Forçamos erro no carregamento, testando o catch interno do construtor/carregarCache
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('read error');
      });

      // Recria o serviço para rodar o construtor novamente com erro
      const newService = new ComprasGovMonitorService(
        {} as any,
        scraperService,
        eventsService,
        systemLogService,
      );
      
      expect(systemLogService.logError).toHaveBeenCalled();
    });
    
    it('should handle non-Error throw in carregarCache', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw 'string error';
      });

      const newService = new ComprasGovMonitorService(
        {} as any,
        scraperService,
        eventsService,
        systemLogService,
      );
      expect(systemLogService.logError).toHaveBeenCalledWith(
        'ComprasGovMonitor',
        'Erro ao carregar cache do monitoramento',
        undefined
      );
    });

    it('should load cache if exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ data: new Date().toISOString(), pregoes: [{ id: '1' }] })
      );
      
      const newService = new ComprasGovMonitorService(
        {} as any,
        scraperService,
        eventsService,
        systemLogService,
      );
      
      const results = newService.getLatestResults();
      expect(results.pregoes.length).toBe(1);
    });
    
    it('should load cache without data field', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ pregoes: [{ id: '1' }] })
      );
      
      const newService = new ComprasGovMonitorService(
        {} as any,
        scraperService,
        eventsService,
        systemLogService,
      );
      
      const results = newService.getLatestResults();
      expect(results.data).toBeNull();
    });
  });

  describe('handleCron', () => {
    it('should skip if already running', async () => {
      (service as any).emExecucao = true;
      await service.handleCron();
      expect(scraperService.scrapeMinhasParticipacoes).not.toHaveBeenCalled();
    });

    it('should execute scrape and process results (new and existing pregao)', async () => {
      // Simula um mapa com dois itens: um para pregão novo, outro para pregão existente (precisamos colocar algo no cache)
      const mockResultMap = new Map();
      mockResultMap.set('item1', {
        uasg: '123', pregao: '1/24',
        nossaPosicao: 1, totalEmpresasNaFrente: 0, concorrentesDesclassificados: [], qtde: '1', valorOfertado: '10'
      });
      mockResultMap.set('item2', {
        uasg: '456', pregao: '2/24',
        nossaPosicao: 2, totalEmpresasNaFrente: 1, concorrentesDesclassificados: [], qtde: '1', valorOfertado: '20'
      });
      
      scraperService.scrapeMinhasParticipacoes.mockResolvedValueOnce(mockResultMap);
      
      // Injeta cache inicial para cobrir branch de 'findIndex >= 0'
      (service as any).ultimaVarreduraResultados = [{
        id: '123-1/24',
        uasg: '123',
        pregao: '1/24',
        itens: []
      }];
      
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // testando mkdirSync

      await service.handleCron();
      
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(eventsService.emitirMonitoramentoConcluido).toHaveBeenCalled();
      
      // Verifica atualizacoes
      const results = service.getLatestResults();
      expect(results.pregoes.length).toBe(2);
    });

    it('should handle zero results gracefully', async () => {
      scraperService.scrapeMinhasParticipacoes.mockResolvedValueOnce(new Map());
      await service.handleCron();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(eventsService.emitirMonitoramentoConcluido).toHaveBeenCalled();
    });

    it('should handle errors in scrape', async () => {
      scraperService.scrapeMinhasParticipacoes.mockRejectedValueOnce(new Error('scrape failed'));
      await service.handleCron();
      expect(systemLogService.logError).toHaveBeenCalledWith(
        'ComprasGovMonitor',
        'Erro no monitoramento do Compras.gov.br',
        expect.any(String)
      );
      expect(eventsService.emitirAlertaMonitoramento).toHaveBeenCalled();
      expect((service as any).emExecucao).toBe(false);
    });
    
    it('should handle non-Error throw in scrape', async () => {
      scraperService.scrapeMinhasParticipacoes.mockRejectedValueOnce('string error');
      await service.handleCron();
      expect(systemLogService.logError).toHaveBeenCalledWith(
        'ComprasGovMonitor',
        'Erro no monitoramento do Compras.gov.br',
        undefined
      );
    });
  });

  describe('saveSyncData', () => {
    it('should initialize empty cache if missing', () => {
      (service as any).ultimaVarreduraResultados = undefined;
      const result = service.saveSyncData([]);
      expect(result.success).toBe(true);
    });

    it('should process intelligence rules and emit radar alerts', () => {
      // Mock data com diferentes competidores e posições
      const mockPregoes = [
        {
          id: '123-1/24',
          itens: [
            {
              itemId: 'item1',
              nossaPosicao: 2,
              status: 'Aberto',
              competidores: [
                { cnpj: '48.262.939/0001-50', valor: 200, status: 'Ativa', textoBruto: '' }, // Nossa empresa
                { cnpj: '00.000.000/0001-91', valor: 100, status: 'Ativa', textoBruto: '' }, // 1o lugar
              ]
            }
          ]
        },
        {
          id: '456-2/24',
          itens: [
            {
              itemId: 'item2',
              nossaPosicao: 1,
              status: 'Adjudicado', // Força branch de status diferente de Ativo/Participando
              competidores: [
                { cnpj: '11.111.111/1111-11', textoBruto: '48262939000150', valor: 100, status: 'Ativa' } // Nossa via texto bruto
              ]
            }
          ]
        },
        {
          id: '789-3/24',
          itens: [
            {
              itemId: 'item3',
              nossaPosicao: 1,
              status: 'Participando', // Força branch (em andamento)
              competidores: [
                { cnpj: '22.222.222/2222-22', textoBruto: 'GRUPO IRMAOS NASCIMENTO', valor: 100, status: 'Ativa' }
              ]
            }
          ]
        },
        {
          id: '000-4/24',
          itens: [
            {
              itemId: 'item4',
              nossaEmpresaStatus: 'Desclassificada',
              competidores: [
                { cnpj: '48.262.939/0001-50', valor: 150, status: 'Ativa', textoBruto: '' } 
              ]
            }
          ]
        },
        {
          id: '111-5/24',
          itens: [
            {
              itemId: 'item5',
              competidores: [
                { cnpj: '00.000.000/0001-91', valor: 100, status: 'Ativa', textoBruto: '' } // Não temos proposta
              ]
            }
          ]
        }
      ];

      // Injeta estado anterior para disparar alertas do Radar
      (service as any).ultimaVarreduraResultados = [
        {
          id: '123-1/24',
          itens: [{ itemId: 'item1', inteligencia: { nossaPosicao: 3 } }] // De 3o pra 2o
        },
        {
          id: '456-2/24',
          itens: [{ itemId: 'item2', inteligencia: { nossaPosicao: 2 } }] // De 2o pra 1o
        },
        {
          id: '789-3/24',
          itens: [{ itemId: 'item3', chat: 'olá' }] // Chat anterior existia
        }
      ];

      // Adiciona msgs novas de chat
      mockPregoes[2].itens[0]['chat'] = 'olá CONVOCADO a enviar proposta!'; // Aciona radar de chat
      
      const result = service.saveSyncData(mockPregoes);

      expect(eventsService.emitirAlertaRadar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'RANKING_2' }));
      expect(eventsService.emitirAlertaRadar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'RANKING_1' }));
      expect(eventsService.emitirAlertaRadar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'CHAT' }));
      expect(eventsService.emitirMonitoramentoConcluido).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle intelligence for our position without other active targets', () => {
      const mockPregoes = [
        {
          id: '123-1/24',
          itens: [
            {
              itemId: 'item1',
              nossaPosicao: 5,
              competidores: [
                { cnpj: '48.262.939/0001-50', valor: 200, status: 'Ativa', textoBruto: '' }
              ]
            }
          ]
        }
      ];

      service.saveSyncData(mockPregoes);
      const results = service.getLatestResults().pregoes;
      const item = results.find(p => p.id === '123-1/24').itens[0];
      expect(item.inteligencia.mensagemEstrategica).toBe('Estamos na 5ª posição.');
    });
    
    it('should catch error when fs fails in salvarCache during saveSyncData', () => {
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('write error');
      });
      service.saveSyncData([]);
      expect(systemLogService.logError).toHaveBeenCalledWith(
        'ComprasGovMonitor',
        'Erro ao salvar cache do monitoramento',
        expect.any(String)
      );
    });
    
    it('should catch non-Error throw in salvarCache', () => {
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw 'string write error';
      });
      service.saveSyncData([]);
      expect(systemLogService.logError).toHaveBeenCalledWith(
        'ComprasGovMonitor',
        'Erro ao salvar cache do monitoramento',
        undefined
      );
    });
  });
});
