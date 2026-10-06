import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';

describe('BotService', () => {
  let service: BotService;

  beforeEach(() => {
    service = new BotService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('should calculate search window correctly (dataFinal > hoje)', () => {
    // default ENV values should be used
    const { dataInicialDate, dataFinalDate } = service.calcularJanelaDeBusca();
    const hoje = new Date();

    expect(dataFinalDate.getTime()).toBeGreaterThan(hoje.getTime());
    expect(dataInicialDate.getTime()).toBeLessThan(hoje.getTime());

    // Default config is +45 and -20
    const diffFinal =
      (dataFinalDate.getTime() - hoje.getTime()) / (1000 * 3600 * 24);
    expect(Math.round(diffFinal)).toBe(45);
  });
});
