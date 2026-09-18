import { Test, TestingModule } from '@nestjs/testing';
import { OportunidadeGateway } from './oportunidade.gateway';
import { EventsService } from '../events/events.service';
import { Subject } from 'rxjs';

describe('OportunidadeGateway', () => {
  let gateway: OportunidadeGateway;
  let mockServer: any;
  let subjectAlertas: Subject<string>;
  let subjectMonitoramento: Subject<any>;

  beforeEach(async () => {
    subjectAlertas = new Subject<string>();
    subjectMonitoramento = new Subject<any>();

    const mockEventsService = {
      getAlertasMonitoramento: jest.fn().mockReturnValue(subjectAlertas.asObservable()),
      getMonitoramentoConcluido: jest.fn().mockReturnValue(subjectMonitoramento.asObservable()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OportunidadeGateway,
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    gateway = module.get<OportunidadeGateway>(OportunidadeGateway);
    mockServer = {
      emit: jest.fn(),
    };
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      gateway.onModuleInit();
    });

    it('should subscribe and handle valid radar JSON', () => {
      const data = { tipo: 'radar', dados: { test: 1 } };
      subjectAlertas.next(JSON.stringify(data));
      expect(mockServer.emit).toHaveBeenCalledWith('alerta_radar', { test: 1 });
    });

    it('should subscribe and handle valid JSON but not radar', () => {
      const data = { tipo: 'other', dados: { test: 1 } };
      const str = JSON.stringify(data);
      subjectAlertas.next(str);
      expect(mockServer.emit).toHaveBeenCalledWith('alerta_monitoramento', { mensagem: str });
    });

    it('should subscribe and handle generic text', () => {
      subjectAlertas.next('simple string');
      expect(mockServer.emit).toHaveBeenCalledWith('alerta_monitoramento', { mensagem: 'simple string' });
    });

    it('should subscribe and handle monitoramento concluido', () => {
      const data = { concluido: true };
      subjectMonitoramento.next(data);
      expect(mockServer.emit).toHaveBeenCalledWith('monitoramento_concluido', data);
    });
  });

  describe('WebSocket Lifecycle', () => {
    it('should log on connect', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleConnection({ id: '123' } as any);
      expect(consoleSpy).toHaveBeenCalledWith('[WebSocket] Client connected: 123');
      consoleSpy.mockRestore();
    });

    it('should log on disconnect', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect({ id: '123' } as any);
      expect(consoleSpy).toHaveBeenCalledWith('[WebSocket] Client disconnected: 123');
      consoleSpy.mockRestore();
    });
  });

  describe('Emitters', () => {
    it('emitOportunidadeUpdate', () => {
      gateway.emitOportunidadeUpdate({ id: 1 });
      expect(mockServer.emit).toHaveBeenCalledWith('oportunidade_updated', { id: 1 });
    });

    it('emitOportunidadeDelete', () => {
      gateway.emitOportunidadeDelete('1');
      expect(mockServer.emit).toHaveBeenCalledWith('oportunidade_deleted', { id: '1' });
    });

    it('emitBotExecutionUpdated with data', () => {
      gateway.emitBotExecutionUpdated({ x: 1 });
      expect(mockServer.emit).toHaveBeenCalledWith('bot_execution_updated', { x: 1 });
    });

    it('emitBotExecutionUpdated without data', () => {
      gateway.emitBotExecutionUpdated();
      expect(mockServer.emit).toHaveBeenCalledWith('bot_execution_updated', {});
    });
  });

  describe('Subscriptions', () => {
    let mockClient: any;
    beforeEach(() => {
      mockClient = {
        broadcast: {
          emit: jest.fn(),
        }
      };
    });

    it('handleToggleCardCollapse', () => {
      const data = { cardId: '1', collapsed: true };
      gateway.handleToggleCardCollapse(data, mockClient);
      expect(mockClient.broadcast.emit).toHaveBeenCalledWith('kanban_card_collapsed', data);
    });

    it('handleToggleColumnCollapse', () => {
      const data = { colId: '1', collapsed: true };
      gateway.handleToggleColumnCollapse(data, mockClient);
      expect(mockClient.broadcast.emit).toHaveBeenCalledWith('kanban_column_collapsed', data);
    });
  });
});
