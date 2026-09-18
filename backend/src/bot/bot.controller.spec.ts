import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { getModelToken } from '@nestjs/mongoose';
import { BotExecucao } from './bot-execucao.schema';

describe('BotController', () => {
  let controller: BotController;
  let botService: jest.Mocked<BotService>;
  let mockBotExecucaoModel: any;

  beforeEach(async () => {
    const mockBotService = {
      executarBuscaDiaria: jest.fn(),
    };

    const modelQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockBotExecucaoModel = {
      find: jest.fn().mockReturnValue(modelQuery),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        {
          provide: BotService,
          useValue: mockBotService,
        },
        {
          provide: getModelToken(BotExecucao.name),
          useValue: mockBotExecucaoModel,
        },
      ],
    }).compile();

    controller = module.get<BotController>(BotController);
    botService = module.get(BotService) as jest.Mocked<BotService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('runNow', () => {
    it('should call botService.executarBuscaDiaria', async () => {
      botService.executarBuscaDiaria.mockResolvedValueOnce({} as any);
      await controller.runNow();
      expect(botService.executarBuscaDiaria).toHaveBeenCalled();
    });
  });

  describe('getExecucoes', () => {
    it('should query botExecucaoModel with pagination', async () => {
      const mockResult = [{ id: 1 }];
      mockBotExecucaoModel.find().exec.mockResolvedValueOnce(mockResult);

      const result = await controller.getExecucoes(5, 10);
      expect(mockBotExecucaoModel.find).toHaveBeenCalled();
      expect(mockBotExecucaoModel.find().sort).toHaveBeenCalledWith({ dataExecucao: -1 });
      expect(mockBotExecucaoModel.find().skip).toHaveBeenCalledWith(10);
      expect(mockBotExecucaoModel.find().limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockResult);
    });

    it('should query botExecucaoModel with default pagination', async () => {
      const mockResult = [{ id: 1 }];
      mockBotExecucaoModel.find().exec.mockResolvedValueOnce(mockResult);

      const result = await controller.getExecucoes();
      expect(mockBotExecucaoModel.find).toHaveBeenCalled();
      expect(mockBotExecucaoModel.find().sort).toHaveBeenCalledWith({ dataExecucao: -1 });
      expect(mockBotExecucaoModel.find().skip).toHaveBeenCalledWith(0);
      expect(mockBotExecucaoModel.find().limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockResult);
    });
  });
});
