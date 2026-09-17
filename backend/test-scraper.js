const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({ 
    executablePath: '/usr/bin/google-chrome', 
    headless: true, 
    args: ['--no-sandbox'] 
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  const url = 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=78360105000512027';
  console.log(`Navegando para: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Aguardando 10 segundos...');
    await new Promise(r => setTimeout(r, 10000));
    
    await page.screenshot({ path: '/home/hobson007breno/.gemini/antigravity-ide/brain/2bbbd3eb-2eaa-41e0-a027-afb922ed5401/scratch/test-screenshot.png' });
    console.log("Screenshot salvo em test-screenshot.png");
    
    const text = await page.evaluate(() => document.body.innerText);
    console.log("== PRÉVIA DO TEXTO ==");
    console.log(text.substring(0, 1500));
    
  } catch(e) {
    console.error('Erro:', e);
  } finally {
    await browser.close();
  }
})();
