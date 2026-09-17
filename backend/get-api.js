const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('json') || url.includes('comprasnet')) {
      console.log('XHR/Fetch URL:', url);
    }
  });

  await page.goto('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=12001405001342026', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
