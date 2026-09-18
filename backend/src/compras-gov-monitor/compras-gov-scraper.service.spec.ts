import { Test, TestingModule } from '@nestjs/testing';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import puppeteer from 'puppeteer-extra';
import { Logger } from '@nestjs/common';

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));
jest.mock('puppeteer-extra-plugin-stealth', () => jest.fn());

describe('ComprasGovScraperService', () => {
  let service: ComprasGovScraperService;

  beforeEach(async () => {
    // Setup env vars
    process.env.GOVBR_CPF = '12345678900';
    process.env.GOVBR_SENHA = 'senha123';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComprasGovScraperService],
    }).compile();

    service = module.get<ComprasGovScraperService>(ComprasGovScraperService);
    
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Silence setTimeout in the service loops
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty map if credentials are missing', async () => {
    delete process.env.GOVBR_CPF;
    const result = await service.scrapeMinhasParticipacoes();
    expect(result.size).toBe(0);
  });

  it('should perform full scraping flow successfully', async () => {
    const mockTargetPage = {
      close: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue(true),
      url: jest.fn().mockReturnValue('http://test.com/?compra=123'),
      evaluate: jest.fn().mockImplementation(async (cb, ...args) => {
        global.document = {
          body: { innerText: 'Texto com CNPJ 48.262.939/0001-50 e mais texto' },
          querySelectorAll: jest.fn((sel) => {
            if (sel.includes('a, button, li')) {
              return [{ textContent: 'Todas as propostas', click: jest.fn() }];
            }
            if (sel.includes('app-proposta')) {
              return [{ textContent: 'Desclassificada' }];
            }
            return [];
          }),
          querySelector: jest.fn((sel) => {
            if (sel.includes('app-cabecalho')) {
              return { textContent: 'UASG: 123456 Pregão: 10/2024' };
            }
            return null;
          }),
        } as any;
        try { return typeof cb === 'function' ? await cb(...args) : cb; } 
        finally { delete (global as any).document; }
      }),
    };

    const mockElementHandle = {
      evaluate: jest.fn().mockImplementation((cb) => cb({ click: jest.fn() })),
    };

    const mockPage = {
      url: jest.fn()
        .mockReturnValueOnce('http://test.com/acesso-nao-autorizado') // 1o check
        .mockReturnValueOnce('http://sso.acesso.gov.br'), // 2o check
      goto: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue(true),
      focus: jest.fn(),
      type: jest.fn(),
      keyboard: { press: jest.fn() },
      waitForNavigation: jest.fn().mockResolvedValue(true),
      $$: jest.fn().mockResolvedValue([mockElementHandle]), // acompanhamentoLinks
      evaluate: jest.fn().mockImplementation(async (cb, ...args) => {
        global.window = { mudaPerfilBotao: jest.fn() } as any;
        global.document = {
          querySelectorAll: jest.fn((sel) => {
            if (sel.includes('.actions button')) {
              return [{ textContent: 'Entrar com Gov.br', click: jest.fn() }];
            }
            if (sel.includes('.p-datatable-tbody')) {
              return [{ textContent: 'PREGÃO', click: jest.fn(), querySelector: () => ({ click: jest.fn() }) }];
            }
            if (sel.includes('.p-dropdown-item')) {
              return [{ textContent: 'itens em que estou participando', click: jest.fn() }];
            }
            return [];
          }),
          querySelector: jest.fn((sel) => {
            if (sel.includes('.p-dropdown-trigger')) return { click: jest.fn() };
            return null;
          }),
        } as any;
        try { return typeof cb === 'function' ? await cb(...args) : cb; }
        finally {
          delete (global as any).document;
          delete (global as any).window;
        }
      }),
      content: jest.fn().mockResolvedValue('<html>error</html>'),
      screenshot: jest.fn(),
      goBack: jest.fn(),
    };

    let targetCallback: any;
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
      once: jest.fn().mockImplementation((event, cb) => {
        if (event === 'targetcreated') {
          // Immediately trigger the callback with a mock target
          cb({ page: () => Promise.resolve(mockTargetPage) });
        }
      }),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const result = await service.scrapeMinhasParticipacoes();
    
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(result.size).toBe(1);
    expect(result.get('123')).toBeDefined();
    expect(result.get('123')?.uasg).toBe('123456');
    expect(result.get('123')?.pregao).toBe('10/2024');
    expect(mockBrowser.close).toHaveBeenCalled();
  });
  
  it('should handle zero pregoes found', async () => {
    const mockPage = {
      url: jest.fn().mockReturnValue('http://cnetmobile.estaleiro.serpro.gov.br/'),
      goto: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue(true),
      evaluate: jest.fn().mockReturnValue(0), // pregoesLength = 0
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const result = await service.scrapeMinhasParticipacoes();
    
    expect(result.size).toBe(0);
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle browser launch failure gracefully', async () => {
    (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));
    const result = await service.scrapeMinhasParticipacoes();
    expect(result.size).toBe(0);
  });
  
  it('should handle login password field missing gracefully (catch block)', async () => {
    const mockPage = {
      url: jest.fn()
        .mockReturnValueOnce('http://sso.acesso.gov.br')
        .mockReturnValueOnce('http://sso.acesso.gov.br'),
      goto: jest.fn(),
      waitForSelector: jest.fn((sel) => {
        if (sel === '#password') return Promise.reject(new Error('timeout'));
        return Promise.resolve(true);
      }),
      focus: jest.fn(),
      type: jest.fn(),
      keyboard: { press: jest.fn() },
      evaluate: jest.fn().mockReturnValue(0), // pregoesLength = 0 to end early
      content: jest.fn().mockResolvedValue('<html>error</html>'),
      screenshot: jest.fn(),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const result = await service.scrapeMinhasParticipacoes();
    expect(mockPage.screenshot).toHaveBeenCalled();
    expect(result.size).toBe(0);
  });
});
