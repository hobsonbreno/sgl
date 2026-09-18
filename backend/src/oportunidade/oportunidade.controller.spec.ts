import { Test, TestingModule } from '@nestjs/testing';
import { OportunidadeController, UpdateStatusDto, ImportarManualDto } from './oportunidade.controller';
import { OportunidadeService } from './oportunidade.service';

describe('OportunidadeController', () => {
  let controller: OportunidadeController;
  let service: jest.Mocked<OportunidadeService>;

  beforeEach(async () => {
    const mockOportunidadeService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      marcarVisualizado: jest.fn(),
      sincronizarItens: jest.fn(),
      remove: jest.fn(),
      importarManual: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OportunidadeController],
      providers: [
        {
          provide: OportunidadeService,
          useValue: mockOportunidadeService,
        },
      ],
    }).compile();

    controller = module.get<OportunidadeController>(OportunidadeController);
    service = module.get(OportunidadeService) as jest.Mocked<OportunidadeService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query = { page: 1 };
      service.findAll.mockResolvedValueOnce([] as any);
      const result = await controller.findAll(query);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      service.findOne.mockResolvedValueOnce({} as any);
      const result = await controller.findOne('123');
      expect(service.findOne).toHaveBeenCalledWith('123');
      expect(result).toEqual({});
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateStatus', async () => {
      const dto: UpdateStatusDto = { kanbanStatus: 'novo' };
      service.updateStatus.mockResolvedValueOnce({} as any);
      const result = await controller.updateStatus('123', dto);
      expect(service.updateStatus).toHaveBeenCalledWith('123', 'novo');
      expect(result).toEqual({});
    });
  });

  describe('marcarVisualizado', () => {
    it('should call service.marcarVisualizado', async () => {
      service.marcarVisualizado.mockResolvedValueOnce({} as any);
      const result = await controller.marcarVisualizado('123');
      expect(service.marcarVisualizado).toHaveBeenCalledWith('123');
      expect(result).toEqual({});
    });
  });

  describe('sincronizarItens', () => {
    it('should call service.sincronizarItens', async () => {
      service.sincronizarItens.mockResolvedValueOnce({} as any);
      const result = await controller.sincronizarItens('123');
      expect(service.sincronizarItens).toHaveBeenCalledWith('123');
      expect(result).toEqual({});
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValueOnce({} as any);
      const result = await controller.remove('123');
      expect(service.remove).toHaveBeenCalledWith('123');
      expect(result).toEqual({});
    });
  });

  describe('importarManual', () => {
    it('should call service.importarManual', async () => {
      const dto: ImportarManualDto = { linkOuControle: 'http://' };
      service.importarManual.mockResolvedValueOnce({} as any);
      const result = await controller.importarManual(dto);
      expect(service.importarManual).toHaveBeenCalledWith('http://');
      expect(result).toEqual({});
    });
  });
});
