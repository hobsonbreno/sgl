import { Test, TestingModule } from '@nestjs/testing';
import { RadarService } from './radar.service';
import { OportunidadeService } from '../oportunidade/oportunidade.service';
import { ComprasnetPublicService } from './comprasnet-public.service';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { Logger } from '@nestjs/common';

describe('RadarService', () => {
  let service: RadarService;
  let oportunidadeService: jest.Mocked<OportunidadeService>;
  let comprasnetPublicService: jest.Mocked<ComprasnetPublicService>;
  let monitorService: jest.Mocked<ComprasGovMonitorService>;

  beforeEach(async () => {
    const oportunidadeServiceMock = {
      findAll: jest.fn(),
    };
    const comprasnetPublicServiceMock = {
      scrapeSalaDisputa: jest.fn(),
    };
    const monitorServiceMock = {
      saveSyncData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RadarService,
        { provide: OportunidadeService, useValue: oportunidadeServiceMock },
        {
          provide: ComprasnetPublicService,
          useValue: comprasnetPublicServiceMock,
        },
        { provide: ComprasGovMonitorService, useValue: monitorServiceMock },
      ],
    }).compile();

    service = module.get<RadarService>(RadarService);
    oportunidadeService = module.get(OportunidadeService);
    comprasnetPublicService = module.get(ComprasnetPublicService);
    monitorService = module.get(ComprasGovMonitorService);
    
    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Fast-forward setTimeouts
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should ignore if already running', async () => {
      (service as any).isRunning = true;
      await service.handleCron();
      expect(oportunidadeService.findAll).not.toHaveBeenCalled();
    });

    it('should handle general error during execution', async () => {
      oportunidadeService.findAll.mockRejectedValue(new Error('general error'));
      await service.handleCron();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Erro geral no ciclo Radar',
        expect.any(Error)
      );
      expect((service as any).isRunning).toBe(false);
    });

    it('should process oportunidades correctly', async () => {
      const mockOportunidades = [
        // Valida
        {
          _id: '1',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'comprasnet',
          unidadeCompradora: '123456',
          numeroCompraOrigem: '00001',
          anoCompraOrigem: '2024',
        },
        // Incompleta
        {
          _id: '2',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'cnetmobile',
          unidadeCompradora: null,
          numeroCompraOrigem: '00002',
          anoCompraOrigem: '2024',
        },
        // Nao FAZENDO
        {
          _id: '3',
          kanbanStatus: 'TODO',
          linkSistemaOrigem: 'comprasnet',
        },
        // Nao comprasnet
        {
          _id: '4',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'licitacoes-e',
        },
        // Link nulo
        {
          _id: '5',
          kanbanStatus: 'FAZENDO',
        },
        // Incompleta - sem numero
        {
          _id: '6',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'comprasnet',
          unidadeCompradora: '123',
        },
        // Incompleta - sem ano
        {
          _id: '7',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'comprasnet',
          unidadeCompradora: '123',
          numeroCompraOrigem: '001',
        },
      ];

      oportunidadeService.findAll.mockResolvedValue({
        data: mockOportunidades,
      } as any);

      comprasnetPublicService.scrapeSalaDisputa.mockResolvedValue({
        chat: ['msg1'],
        posicoes: ['pos1'],
      });

      await service.handleCron();

      expect(comprasnetPublicService.scrapeSalaDisputa).toHaveBeenCalledWith(
        '123456',
        '00001/2024'
      );
      expect(monitorService.saveSyncData).toHaveBeenCalledWith([
        {
          id: '123456-00001/2024',
          uasg: '123456',
          pregao: '00001/2024',
          itens: [
            {
              numero: 1,
              nossaPosicao: 'pos1',
              rawChat: 'msg1',
              rawPosicoes: 'pos1',
            },
          ],
        },
      ]);
      expect((service as any).isRunning).toBe(false);
    });

    it('should handle error inside specific oportunidade processing', async () => {
      const mockOportunidades = [
        {
          _id: '1',
          kanbanStatus: 'FAZENDO',
          linkSistemaOrigem: 'comprasnet',
          unidadeCompradora: '123456',
          numeroCompraOrigem: '00001',
          anoCompraOrigem: '2024',
        },
      ];

      oportunidadeService.findAll.mockResolvedValue({
        data: mockOportunidades,
      } as any);

      comprasnetPublicService.scrapeSalaDisputa.mockRejectedValue(
        new Error('scrape error')
      );

      await service.handleCron();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Erro ao monitorar a oportunidade 1',
        expect.any(Error)
      );
      expect((service as any).isRunning).toBe(false);
    });
  });
});
