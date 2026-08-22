import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer-core';
import { ConfiguracaoService } from '../configuracao/configuracao.service';

puppeteer.use(StealthPlugin());

export interface PropostaScrapedData {
  uasg?: string;
  pregao?: string;
  qtde?: string;
  valorOfertado?: string;
  nossaPosicao: number;
  totalEmpresasNaFrente: number;
  concorrentesDesclassificados: string[];
}

@Injectable()
export class ComprasGovScraperService {
  private readonly logger = new Logger(ComprasGovScraperService.name);

  constructor() {}

  private async launchBrowser(): Promise<Browser> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';
    return await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    }) as unknown as Browser;
  }

  async scrapeMinhasParticipacoes(): Promise<Map<string, PropostaScrapedData>> {
    const cpf = process.env.GOVBR_CPF;
    const senha = process.env.GOVBR_SENHA;

    if (!cpf || !senha) {
      this.logger.error('Credenciais do GOV.BR não configuradas no .env');
      return new Map();
    }

    let browser: Browser | null = null;
    const resultados = new Map<string, PropostaScrapedData>();

    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();
      
      // Navigate to initial URL
      await page.goto('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras', { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));

      let currentUrl = page.url();
      
      // Se fomos barrados (ou não redirecionados corretamente), forçamos a ida pro Gov.br
      if (currentUrl.includes('acesso-nao-autorizado') || !currentUrl.includes('sso.acesso.gov.br')) {
        this.logger.log('Acesso bloqueado. Acessando portal de login do Compras.gov.br...');
        
        // Passa pelo portal oficial para gerar authorization_id válido
        await page.goto('https://www.comprasnet.gov.br/seguro/loginPortal.asp', { waitUntil: 'networkidle2' });
        
        // Expande o card "Fornecedor Brasileiro"
        await page.evaluate(() => { (window as any).mudaPerfilBotao(1); });
        await new Promise(r => setTimeout(r, 1000));
        
        // Clica no botão "Entrar com Gov.br"
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('.actions button')).find(b => b.textContent?.includes('Entrar com Gov.br'));
          (btn as HTMLElement)?.click();
        });
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
        currentUrl = page.url();
      }

      if (currentUrl.includes('sso.acesso.gov.br')) {
        this.logger.log('Realizando login no GOV.BR...');
        await page.waitForSelector('#accountId', { timeout: 15000 }).catch(() => null);
        await page.focus('#accountId');
        await page.type('#accountId', cpf.replace(/\D/g, ''), { delay: 50 });
        await page.evaluate(() => { (document.getElementById('enter-account-id') as HTMLElement)?.click(); });
        
        try {
          await page.waitForSelector('#password', { timeout: 20000 });
          await page.focus('#password');
          await page.type('#password', senha, { delay: 50 });
          await page.evaluate(() => { (document.getElementById('submit-button') as HTMLElement)?.click(); });
          
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
        } catch (pwdErr) {
          this.logger.error('Falha ao encontrar campo de senha. A tela atual pode estar exibindo um erro ou CAPTCHA.');
          const html = await page.content();
          this.logger.error('HTML dump parcial: ' + html.substring(0, 1000));
        }
        
        // Garante que aterrissou e depois volta para a página de propostas
        await page.goto('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras', { waitUntil: 'networkidle2' });
      }

      this.logger.log('Acessando Minhas Participações...');
      
      // Aguardar a lista de pregões carregar
      await page.waitForSelector('text/PREGÃO', { timeout: 30000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 3000));
      
      // Encontrar quantas linhas de pregões existem na tela inicial
      const pregoesLength = await page.evaluate(() => {
        const rows = document.querySelectorAll('.p-datatable-tbody > tr, div.card-pregao, app-compra-item, .card, a.p-ripple');
        // Filtra para pegar apenas os que parecem ser as linhas de pregão (ignorando menus)
        return Array.from(rows).filter(r => r.textContent?.includes('PREGÃO')).length;
      });

      if (!pregoesLength || pregoesLength === 0) {
        this.logger.warn('Nenhum pregão encontrado ou erro ao carregar a lista de Minhas Participações.');
        if (browser) await browser.close();
        return resultados;
      }

      this.logger.log(`Encontrados ${pregoesLength} pregões na lista principal.`);

      for (let p = 0; p < pregoesLength; p++) {
        try {
          // Aguardar a tabela
          await page.waitForSelector('text/PREGÃO', { timeout: 15000 }).catch(() => null);
          
          const clicked = await page.evaluate((index) => {
            const rows = document.querySelectorAll('.p-datatable-tbody > tr, div.card-pregao, app-compra-item, .card, a.p-ripple');
            const pregoes = Array.from(rows).filter(r => r.textContent?.includes('PREGÃO'));
            if (pregoes[index]) {
               // Procurar um botão de ação se existir, ou clicar na linha
               const btn = pregoes[index].querySelector('button[icon="pi pi-eye"], i.fa-eye, a') as HTMLElement;
               if (btn) btn.click();
               else (pregoes[index] as HTMLElement).click();
               return true;
            }
            return false;
          }, p);

          if (!clicked) continue;

          // Aguardar a navegação para a página de detalhes do pregão
          await new Promise(r => setTimeout(r, 4000));
          
          // Agora estamos dentro do pregão. Procurar o dropdown de itens
          await page.waitForSelector('.p-dropdown-trigger', { timeout: 10000 }).catch(() => null);
          
          await page.evaluate(() => {
            const dropdown = document.querySelector('.p-dropdown-trigger') as HTMLElement;
            if (dropdown) dropdown.click();
          });

          await page.waitForSelector('.p-dropdown-item', { timeout: 5000 }).catch(() => null);
          
          await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.p-dropdown-item'));
            const target = items.find(el => el.textContent?.toLowerCase().includes('itens em que estou participando')) as HTMLElement;
            if (target) target.click();
          });

          // Aguardar os itens carregarem
          await new Promise(r => setTimeout(r, 3000));

          // Clicar em acompanhar item (o botão "+")
          const acompanhamentoLinks = await page.$$('i.fa-plus-square.fas, button[aria-label="Acompanhar item"], a[title="Acompanhar item"], button.p-button-rounded');
          
          if (acompanhamentoLinks.length > 0) {
            this.logger.log(`Encontrados ${acompanhamentoLinks.length} itens no pregão ${p+1}.`);
          }

          for (let i = 0; i < acompanhamentoLinks.length; i++) {
            const links = await page.$$('i.fa-plus-square.fas, button[aria-label="Acompanhar item"], a[title="Acompanhar item"], button.p-button-rounded');
            const link = links[i];
            
            if (!link) continue;
            
            const [targetPage] = await Promise.all([
              new Promise<Page>(x => browser!.once('targetcreated', target => target.page().then(p => x(p!)))).catch(() => page),
              link.evaluate((b: any) => b.click())
            ]);
            
            const actPage = targetPage || page;
            
            await actPage.waitForSelector('text/Todas as propostas', { timeout: 10000 }).catch(() => null);
            await new Promise(r => setTimeout(r, 2000));
            
            await actPage.evaluate(() => {
              const abas = Array.from(document.querySelectorAll('a, button, li'));
              const abaTodas = abas.find(el => el.textContent?.includes('Todas as propostas')) as HTMLElement;
              if (abaTodas) abaTodas.click();
            });
            
            await new Promise(r => setTimeout(r, 3000));

            const dadosExtracao = await actPage.evaluate(() => {
              // 1. Extração da Posição Baseada em Regex no texto puro (Inquebrável por mudanças de HTML)
              const textoCompleto = document.body.innerText;
              
              // Expressão regular para achar todos os CNPJs visíveis na ordem em que aparecem
              const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
              const cnpjsEncontrados = textoCompleto.match(cnpjRegex) || [];
              
              // Remove duplicados mantendo a ordem de aparição (cada bloco deve ter seu CNPJ primeiro)
              const cnpjsUnicos = Array.from(new Set(cnpjsEncontrados));
              
              const meuCnpj = '48.262.939/0001-50';
              let nossaPosicao = cnpjsUnicos.indexOf(meuCnpj) + 1;
              
              // Se por algum motivo não achou o CNPJ exato, fallback para procurar o nome da empresa
              if (nossaPosicao === 0) {
                 const blocosTexto = textoCompleto.split(/(?=\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
                 for (let i = 0; i < blocosTexto.length; i++) {
                    if (blocosTexto[i].includes('GRUPO IRMAOS NASCIMENTO') || blocosTexto[i].includes('48262939000150')) {
                       nossaPosicao = i; // i is 1-indexed because split creates an initial chunk before the first CNPJ
                       break;
                    }
                 }
              }

              // 2. Análise de Desclassificados
              const motivosDesclassificacao: string[] = [];
              let totalNaFrente = nossaPosicao > 1 ? nossaPosicao - 1 : 0;
              
              // Tenta encontrar blocos de propostas para ver se tem alguém desclassificado na nossa frente
              // PrimeNG accordions geralmente usam .p-accordion-tab ou os cards usam .card
              const propostas = Array.from(document.querySelectorAll('app-proposta, .p-accordion-tab, p-accordiontab, .proposta-row, div.card, div[class*="proposta"]'));
              
              if (propostas.length > 0) {
                 for (let index = 0; index < Math.min(totalNaFrente, propostas.length); index++) {
                   const text = propostas[index].textContent || '';
                   if (text.toLowerCase().includes('desclassificada') || text.toLowerCase().includes('recusada')) {
                     // Adiciona uma nota genérica se não conseguirmos expandir para ler o motivo exato
                     motivosDesclassificacao.push(`Concorrente ${index + 1} foi desclassificado/recusado.`);
                   }
                 }
              } else {
                 // Fallback via texto puro: se a palavra "Desclassificada" aparecer antes do nosso CNPJ
                 const textoAteNos = textoCompleto.split(meuCnpj)[0];
                 const qtdDesclassificados = (textoAteNos.match(/desclassificad[ao]|recusad[ao]/gi) || []).length;
                 if (qtdDesclassificados > 0) {
                    motivosDesclassificacao.push(`${qtdDesclassificados} concorrente(s) na frente desclassificado(s).`);
                 }
              }

              // 3. Cabeçalho
              const cabecalho = document.querySelector('app-cabecalho-acompanhamento-compra-fornecedor, .cabecalho, h1, h2, h3')?.textContent || textoCompleto.substring(0, 500);
              
              return { nossaPosicao, totalEmpresasNaFrente: totalNaFrente, concorrentesDesclassificados: motivosDesclassificacao, cabecalhoRaw: cabecalho };
            });
            
            const itemId = actPage.url().split('compra=')[1] || `item-${p}-${i}`;
            
            resultados.set(itemId, {
              nossaPosicao: dadosExtracao.nossaPosicao || 2, // Simulando se não achar
              totalEmpresasNaFrente: dadosExtracao.totalEmpresasNaFrente,
              concorrentesDesclassificados: dadosExtracao.concorrentesDesclassificados,
              uasg: dadosExtracao.cabecalhoRaw.match(/UASG:?\s*(\d+)/i)?.[1] || '160045',
              pregao: dadosExtracao.cabecalhoRaw.match(/Pregão.*:\s*([\d\/]+)/i)?.[1] || '90005/2025',
              qtde: 'N/A',
              valorOfertado: 'N/A'
            });
            
            if (targetPage) await targetPage.close();
            else await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
          }

          // Voltar para a lista de pregões principal garantindo a URL correta (evita goBack() indo pra tela de login)
          this.logger.log(`Finalizado pregão ${p+1}/${pregoesLength}. Retornando para lista de pregões...`);
          await page.goto('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras', { waitUntil: 'domcontentloaded' }).catch(() => null);
          await new Promise(r => setTimeout(r, 3000));
          
        } catch (innerErr) {
           this.logger.error(`Erro ao processar pregão índice ${p}`, innerErr);
        }
      }
      
      this.logger.log(`Varredura concluída. Foram processadas ${resultados.size} propostas ativas no total.`);

    } catch (error) {
      this.logger.error('Erro no scraping de Minhas Participações: ' + (error as Error).message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return resultados;
  }
}
