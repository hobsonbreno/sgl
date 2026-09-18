import { Test, TestingModule } from '@nestjs/testing';
import { SefazCeScraperService } from './sefaz-ce-scraper.service';
import puppeteer from 'puppeteer-core';
import { Logger } from '@nestjs/common';

jest.mock('puppeteer-core');

describe('SefazCeScraperService', () => {
  let service: SefazCeScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SefazCeScraperService],
    }).compile();

    service = module.get<SefazCeScraperService>(SefazCeScraperService);
    
    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('formatarCoepParaPesquisa', () => {
    it('should format full PNCP string correctly', () => {
      expect(service.formatarCoepParaPesquisa('202627134/2026')).toBe('2026/27134');
      expect(service.formatarCoepParaPesquisa('algumacoisa12345/2024')).toBe('2024/12345');
    });

    it('should format simple 5 digit string', () => {
      expect(service.formatarCoepParaPesquisa('12345')).toBe('12345');
      expect(service.formatarCoepParaPesquisa('202627134')).toBe('27134');
    });

    it('should return null for invalid strings', () => {
      expect(service.formatarCoepParaPesquisa('')).toBeNull();
      expect(service.formatarCoepParaPesquisa('123')).toBeNull();
    });
  });

  describe('buscarStatusCotacaoSefaz', () => {
    let mockPage: any;
    let mockBrowser: any;

    beforeEach(() => {
      mockPage = {
        setRequestInterception: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'request') {
            // Mocking request interceptor for abort/continue branches
            callback({
              resourceType: () => 'image',
              abort: jest.fn(),
              continue: jest.fn(),
            });
            callback({
              resourceType: () => 'document',
              abort: jest.fn(),
              continue: jest.fn(),
            });
          }
        }),
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        type: jest.fn(),
        click: jest.fn(),
        waitForFunction: jest.fn().mockResolvedValue({
          jsonValue: jest.fn().mockResolvedValue('FINALIZADA'),
        }),
      };

      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    });

    it('should successfully scrape the status', async () => {
      const result = await service.buscarStatusCotacaoSefaz('2024/12345');
      expect(result).toBe('FINALIZADA');
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://s2gpr.sefaz.ce.gov.br/cotacao-web/paginas/proposta/PropostaList.seam',
        { waitUntil: 'networkidle2' },
      );
      expect(mockPage.type).toHaveBeenCalledWith(expect.any(String), '2024/12345');
      expect(mockPage.click).toHaveBeenCalled();
      expect(mockPage.waitForFunction).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle timeout waiting for element and return null', async () => {
      mockPage.waitForFunction.mockRejectedValue(new Error('Waiting failed: timeout 15000ms exceeded'));
      const result = await service.buscarStatusCotacaoSefaz('2024/12345');
      expect(result).toBeNull();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle generic errors and return null', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));
      const result = await service.buscarStatusCotacaoSefaz('2024/12345');
      expect(result).toBeNull();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser launch failure safely', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Failed to launch'));
      const result = await service.buscarStatusCotacaoSefaz('2024/12345');
      expect(result).toBeNull();
      // Browser wasn't created, so close shouldn't be called
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });
  });
});
