const puppeteer = require('puppeteer-core');

(async () => {
  const cpf = process.env.GOVBR_CPF;
  const senha = process.env.GOVBR_SENHA;
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  console.log("Navigating...");
  await page.goto('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras', { waitUntil: 'domcontentloaded' });
  
  const loginUrl = page.url();
  if (loginUrl.includes('sso.acesso.gov.br')) {
    console.log("Logging in...");
    await page.waitForSelector('#accountId');
    await page.type('#accountId', cpf);
    await page.click('#enter-account-id');
    await page.waitForSelector('#password', { visible: true });
    await page.type('#password', senha);
    await page.click('#submit-button');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }
  
  console.log("Waiting for list to render (15s)...");
  await new Promise(r => setTimeout(r, 15000));
  
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('/app/compras-page-full.html', html);
  console.log("Saved to /app/compras-page-full.html");
  
  await browser.close();
})();
