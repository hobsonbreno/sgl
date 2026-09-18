import { Test, TestingModule } from '@nestjs/testing';
import { ComprasGovMonitorController } from './compras-gov-monitor.controller';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { RadarService } from './radar.service';

describe('ComprasGovMonitorController', () => {
  let controller: ComprasGovMonitorController;
  let monitorService: jest.Mocked<ComprasGovMonitorService>;
  let radarService: jest.Mocked<RadarService>;

  beforeEach(async () => {
    const monitorServiceMock = {
      saveSyncData: jest.fn(),
      getLatestResults: jest.fn(),
    };
    const radarServiceMock = {
      handleCron: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComprasGovMonitorController],
      providers: [
        { provide: ComprasGovMonitorService, useValue: monitorServiceMock },
        { provide: RadarService, useValue: radarServiceMock },
      ],
    }).compile();

    controller = module.get<ComprasGovMonitorController>(
      ComprasGovMonitorController,
    );
    monitorService = module.get(ComprasGovMonitorService);
    radarService = module.get(RadarService);
    
    // Mock global console.log para evitar sujeira no console durante os testes
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveSniffedData', () => {
    it('should receive sniffed data with comprasnet url', async () => {
      const result = await controller.receiveSniffedData({
        url: 'https://comprasnet.gov.br/api',
        body: { test: 'data' },
      });
      expect(result).toEqual({ success: true });
      expect(console.log).toHaveBeenCalled();
    });

    it('should receive sniffed data without comprasnet url', async () => {
      const result = await controller.receiveSniffedData({
        url: 'https://other.url/api',
      });
      expect(result).toEqual({ success: true });
    });
    
    it('should handle empty data safely', async () => {
      const result = await controller.receiveSniffedData(undefined);
      expect(result).toEqual({ success: true });
    });

    it('should handle data without url safely', async () => {
      const result = await controller.receiveSniffedData({ body: 'no url' });
      expect(result).toEqual({ success: true });
    });
  });

  describe('runNow', () => {
    it('should trigger radar service handleCron manually', () => {
      const result = controller.runNow();
      expect(radarService.handleCron).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Monitoramento do Compras.gov.br iniciado em background.',
      });
    });

    it('should handle error if handleCron rejects (coverage)', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      radarService.handleCron.mockRejectedValueOnce(new Error('error'));
      const result = controller.runNow();
      
      // small delay to let the promise rejection be caught
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Monitoramento do Compras.gov.br iniciado em background.',
      });
    });
  });

  describe('syncData', () => {
    it('should pass data to monitor service', () => {
      const mockData = [{ pregao: '123' }];
      monitorService.saveSyncData.mockReturnValueOnce({ success: true, count: 1 } as any);
      const result = controller.syncData(mockData);
      expect(monitorService.saveSyncData).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true, count: 1 });
    });
  });

  describe('getLatest', () => {
    it('should return latest results from monitor service', () => {
      monitorService.getLatestResults.mockReturnValueOnce({
        data: new Date(),
        pregoes: [],
      });
      const result = controller.getLatest();
      expect(monitorService.getLatestResults).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pregoes');
    });
  });
});
