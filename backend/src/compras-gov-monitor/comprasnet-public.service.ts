import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';

puppeteer.use(StealthPlugin());

@Injectable()
export class ComprasnetPublicService {
  private readonly logger = new Logger(ComprasnetPublicService.name);

  async scrapeSalaDisputa(uasg: string, pregaoNum: string): Promise<any> {
    // Formata o número da compra. Exemplo: UASG 783601, Pregão 51/2027 => 783601 05 00051 2027
    const uasgStr = uasg.padStart(6, '0');
    const modalidade = '05'; // 05 = Pregão Eletrônico

    // Separa 51/2027 em numero e ano
    let numStr = '00000';
    let anoStr = '2024';
    if (pregaoNum.includes('/')) {
      const [n, a] = pregaoNum.split('/');
      numStr = n.padStart(5, '0');
      anoStr = a;
    } else {
      numStr = pregaoNum.substring(0, 5).padStart(5, '0');
      anoStr = pregaoNum.substring(5) || '2024';
    }

    const pId = `${uasgStr}${modalidade}${numStr}${anoStr}`;
    const url = `https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=${pId}`;

    this.logger.log(`Iniciando scrape via Puppeteer para: ${url}`);
    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      );

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

      this.logger.log(
        `Página carregada, aguardando renderização do Angular SPA...`,
      );
      // Wait for the app to render the main content
      await new Promise((r) => setTimeout(r, 12000));

      await page.screenshot({
        path: `/app/screenshot_${pId}.png`,
        fullPage: true,
      });
      this.logger.log(`Screenshot salva em /app/screenshot_${pId}.png`);

      const data = await page.evaluate(() => {
        // Extrai o chat
        const msgs: string[] = [];
        const chatRows = document.querySelectorAll(
          'app-chat-mensagem, .mensagem-texto',
        );
        chatRows.forEach((row) => {
          msgs.push((row as HTMLElement).innerText || row.textContent || '');
        });

        // Extrai as posições
        const positions: string[] = [];
        const posRows = document.querySelectorAll(
          'app-classificacao-item, .classificacao-row',
        );
        posRows.forEach((row) => {
          positions.push(
            (row as HTMLElement).innerText || row.textContent || '',
          );
        });

        const pageText = document.body.innerText;
        return {
          chat: msgs,
          posicoes: positions,
          rawText: pageText.substring(0, 1000),
        };
      });

      this.logger.log(
        `Scrape finalizado para ${pId}. Encontradas ${data.chat.length} msgs e ${data.posicoes.length} itens no ranking.`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(
        `Erro ao fazer scrape da sala de disputa ${pId}: ${error.message}`,
        error.stack || error,
      );
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
