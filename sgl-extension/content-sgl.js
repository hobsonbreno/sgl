// content-sgl.js
function readSGLData() {
  const dataDiv = document.getElementById('sgl-extension-data');
  if (dataDiv) {
    const data = {
      uasg: dataDiv.getAttribute('data-uasg'),
      processo: dataDiv.getAttribute('data-processo'),
      objeto: dataDiv.getAttribute('data-objeto'),
      timestamp: Date.now()
    };
    
    // Armazena os dados localmente no Chrome para a extensão ler no Comprasnet
    chrome.storage.local.set({ sglActiveData: data }, () => {
      console.log("🚀 SGL Extension: Dados capturados com sucesso!", data);
    });
  }
}

// Observa mudanças na DOM (necessário pois o SGL é um React SPA)
const observer = new MutationObserver(() => readSGLData());
observer.observe(document.body, { childList: true, subtree: true });

// Roda a primeira vez
readSGLData();
