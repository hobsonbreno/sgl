import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-core';

@Injectable()
export class SefazCeScraperService {
  private readonly logger = new Logger(SefazCeScraperService.name);

  /**
   * Converte o padrão do PNCP "202627134/2026" para o padrão de pesquisa da Sefaz "2026/27134"
   * Pega os últimos 5 dígitos antes da barra, e inverte com o que vem depois da barra.
   */
  public formatarCoepParaPesquisa(numeroBruto: string): string | null {
    if (!numeroBruto) return null;
    const regex = /.*?(\d{5})\/(\d{4})/;
    const match = numeroBruto.match(regex);
    if (match) {
      const cincoDigitos = match[1];
      const ano = match[2];
      return `${ano}/${cincoDigitos}`;
    }
    // Caso venha só a primeira parte (ex: numeroCompraOrigem="202627134" anoCompra=2026)
    if (numeroBruto.length >= 5 && !numeroBruto.includes('/')) {
      const cincoDigitos = numeroBruto.slice(-5);
      return cincoDigitos;
    }
    return null;
  }

  /**
   * Consulta o portal do S2GPR Sefaz CE para extrair o status real de uma cotação.
   * @param numeroCoep Ex: "2026/27134"
   */
  async buscarStatusCotacaoSefaz(numeroCoep: string): Promise<string | null> {
    this.logger.log(`Iniciando raspagem de dados no Sefaz CE via Puppeteer para a CoEP: ${numeroCoep}`);
    
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
    let browser;
    try {
      // Usamos puppeteer-core e apontamos para o Chromium instalado no Alpine (ou no host)
      browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: true,
        acceptInsecureCerts: true, // Substitui o antigo ignoreHTTPSErrors
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--ignore-certificate-errors'
        ]
      });

      const page = await browser.newPage();
      
      // Bloquear recursos inúteis para acelerar
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // 1. Acessa a página principal
      await page.goto('https://s2gpr.sefaz.ce.gov.br/cotacao-web/paginas/proposta/PropostaList.seam', { waitUntil: 'networkidle2' });

      // 2. Espera o campo de CoEP carregar e preenche
      const inputSelector = 'input[id="formularioDeCrud:numeroCoepDecoration:numeroCoep"]';
      await page.waitForSelector(inputSelector);
      await page.type(inputSelector, numeroCoep);

      // 3. Clica no botão pesquisar
      const searchBtn = 'input[id="formularioDeCrud:pesquisar"]';
      await page.click(searchBtn);

      // 4. Espera a requisição AJAX (a4j) terminar. O rich-table será recarregado.
      // Como o ID da tabela pode ser o mesmo, aguardamos que a linha contenha o número da CoEP que buscamos.
      this.logger.log(`Aguardando tabela atualizar com os dados de ${numeroCoep}...`);
      
      // Função no browser para procurar o status na tabela
      const extractedStatus = await page.waitForFunction((coep) => {
        const rows = document.querySelectorAll('.rich-table tr.rich-table-row');
        for (let row of rows) {
          const cols = row.querySelectorAll('td');
          // No Sefaz CE, CoEP geralmente é a coluna 1 ou 2, Status é 3 ou 4.
          // Baseado no teste empírico: [Checkbox/Vazio] [Nº COEP] [Status] [Protocolo]
          // Index: 0=Vazio, 1=COEP, 2=Status, 3=Protocolo
          if (cols.length >= 3) {
            const rowCoep = cols[1].innerText.trim();
            if (rowCoep === coep) {
              return cols[2].innerText.trim();
            }
          }
        }
        return false;
      }, { timeout: 15000 }, numeroCoep); // 15s timeout

      const status = await extractedStatus.jsonValue();
      this.logger.log(`Status encontrado para ${numeroCoep}: ${status}`);
      return status as string;

    } catch (error) {
      this.logger.error(`Erro ao consultar Sefaz CE via Puppeteer: ${error.message}`);
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
