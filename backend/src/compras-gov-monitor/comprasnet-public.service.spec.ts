import { Test, TestingModule } from '@nestjs/testing';
import { ComprasnetPublicService } from './comprasnet-public.service';
import puppeteer from 'puppeteer-extra';

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));

jest.mock('puppeteer-extra-plugin-stealth', () => jest.fn());

describe('ComprasnetPublicService', () => {
  let service: ComprasnetPublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComprasnetPublicService],
    }).compile();

    service = module.get<ComprasnetPublicService>(ComprasnetPublicService);
    
    // Silence logger
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrapeSalaDisputa', () => {
    it('should successfully scrape data', async () => {
      const mockPage = {
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        goto: jest.fn(),
        screenshot: jest.fn(),
        evaluate: jest.fn().mockImplementation(async (cb) => {
          global.document = {
            querySelectorAll: jest.fn((selector) => {
              if (selector.includes('app-chat-mensagem')) {
                return [{ innerText: 'msg1' }, { textContent: '' }];
              }
              if (selector.includes('app-classificacao-item')) {
                return [{ innerText: 'pos1' }];
              }
              return [];
            }) as any,
            body: { innerText: 'some text '.repeat(200) } // ensures it hits substring(0,1000)
          } as any;
          
          try {
            return await cb();
          } finally {
            delete (global as any).document;
          }
        }),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Need to fast-forward setTimeout inside the service
      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb();
        return 0 as any;
      });

      const result = await service.scrapeSalaDisputa('123456', '51/2027');

      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=12345605000512027',
        expect.any(Object)
      );
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(result).toEqual({
        chat: ['msg1', ''],
        posicoes: ['pos1'],
        rawText: 'some text '.repeat(200).substring(0, 1000),
      });
    });

    it('should successfully scrape data when pregaoNum has no slash', async () => {
      const mockPage = {
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        goto: jest.fn(),
        screenshot: jest.fn(),
        evaluate: jest.fn().mockImplementation(async (cb) => {
          global.document = {
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { innerText: '' }
          } as any;
          const res = await cb();
          delete (global as any).document;
          return res;
        }),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb();
        return 0 as any;
      });

      const result = await service.scrapeSalaDisputa('123456', '000512027');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=12345605000512027',
        expect.any(Object)
      );
    });

    it('should successfully scrape data when pregaoNum is too short without slash', async () => {
      const mockPage = {
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        goto: jest.fn(),
        screenshot: jest.fn(),
        evaluate: jest.fn().mockImplementation(async (cb) => {
          global.document = {
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { innerText: '' }
          } as any;
          const res = await cb();
          delete (global as any).document;
          return res;
        }),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb();
        return 0 as any;
      });

      // Se pregaoNum = '12', substring(0,5) = '12', padStart = '00012', substring(5) = '' -> anoStr '2024'
      const result = await service.scrapeSalaDisputa('123', '12');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=00012305000122024',
        expect.any(Object)
      );
    });

    it('should handle errors and close browser if launched', async () => {
      const mockBrowser = {
        newPage: jest.fn().mockRejectedValue(new Error('newPage failed')),
        close: jest.fn(),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      await expect(service.scrapeSalaDisputa('123456', '51/2027')).rejects.toThrow('newPage failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle errors when browser fails to launch', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('launch failed'));

      await expect(service.scrapeSalaDisputa('123456', '51/2027')).rejects.toThrow('launch failed');
    });
  });
});
