const fs = require('fs');

let content = fs.readFileSync('sgl-extension/content-gov.js', 'utf8');

// Modificar a inicialização para usar o Iframe Invisível
content = content.replace(
`const participacoesInterval = setInterval(async () => {
  if (window.location.href.includes('comprasnet-web/seguro/fornecedor/compras')) {
    createSyncWidget();
    if (!isAutoSyncing) {
      isAutoSyncing = true;
      console.log('SGL Auto-Sync: Iniciando varredura em background...');
      try {
        await startScrapingParticipacoes();
      } catch (e) {
        console.error(e);
      } finally {
        // Espera 1 hora (60 minutos) antes de permitir nova varredura automática
        setTimeout(() => { isAutoSyncing = false; }, 60 * 60 * 1000);
      }
    }
  } else {
    const w = document.getElementById('sgl-sync-widget');
    if (w) w.remove();
    syncWidgetCreated = false;
  }
}, 5000);`,
`
const INVISIBLE_IFRAME_NAME = 'sgl-invisible-iframe';

const participacoesInterval = setInterval(async () => {
  if (window.location.href.includes('comprasnet-web/seguro')) {
    
    // SE FOR A JANELA PRINCIPAL (NÃO É IFRAME)
    if (window === window.top) {
      let iframe = document.getElementById(INVISIBLE_IFRAME_NAME);
      if (!iframe) {
        console.log("🚀 SGL Radar: Criando Iframe Invisível para varredura em background...");
        iframe = document.createElement('iframe');
        iframe.id = INVISIBLE_IFRAME_NAME;
        iframe.name = INVISIBLE_IFRAME_NAME;
        iframe.src = 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras';
        // Renderiza fora da tela para não bugar o Angular/PrimeNG, mas grande o suficiente para não quebrar layout
        iframe.style = 'position: absolute; left: -9999px; top: -9999px; width: 1920px; height: 1080px; visibility: hidden; pointer-events: none; opacity: 0; border: none;';
        document.body.appendChild(iframe);
        
        // Recarrega o iframe a cada 4 minutos para iniciar um novo ciclo de varredura
        setInterval(() => {
          console.log("🚀 SGL Radar: Recarregando Iframe Invisível para novo ciclo...");
          iframe.src = 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras';
        }, 4 * 60 * 1000);
      }
    } 
    // SE FOR O IFRAME INVISÍVEL
    else if (window.name === INVISIBLE_IFRAME_NAME) {
      if (!isAutoSyncing) {
        isAutoSyncing = true;
        console.log('SGL Auto-Sync (Iframe): Iniciando varredura rápida e invisível...');
        try {
          await startScrapingParticipacoes();
        } catch (e) {
          console.error(e);
        } finally {
          // O Iframe será recarregado pelo parent a cada 4 minutos, então aqui só evita reentrada imediata
          setTimeout(() => { isAutoSyncing = false; }, 60 * 60 * 1000);
        }
      }
    }
  }
}, 5000);
`
);

// Na função que busca o chat, garantir que pegamos exatamente se o nome da empresa ou CNPJ é chamado.
// Isso será feito no backend, então a extensão apenas envia o texto do chat.

fs.writeFileSync('sgl-extension/content-gov.js', content, 'utf8');
