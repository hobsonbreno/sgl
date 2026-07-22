// content-gov.js
console.log("🚀 SGL Extension: Assistente carregado no site do Governo.");

// Tenta injetar os botões flutuantes a cada 1 segundo (útil para Single Page Apps governamentais)
let widgetCreated = false;

const intervalId = setInterval(() => {
  if (widgetCreated) return;
  
  try {
    if (!chrome || !chrome.storage) {
      clearInterval(intervalId);
      return;
    }

    chrome.storage.local.get('sglActiveData', (result) => {
      // Se ocorreu algum erro assíncrono (ex: extensão recarregada), aborta
      if (chrome.runtime.lastError) {
        clearInterval(intervalId);
        return;
      }

      const data = result.sglActiveData;
      if (!data) return;
      
      // Ignorar dados de Oportunidades velhas (mais de 2 horas)
      if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) {
        console.log("🚀 SGL Extension: Dados expirados.");
        return;
      }

      // Não injetar em popups de aviso do governo que não possuem campos de busca
      const hasInputs = document.querySelectorAll('input:not([type="hidden"]), textarea').length > 0;
      if (!hasInputs && window.location.href.includes('popup')) {
        console.log("🚀 SGL Extension: Ignorando janela de popup sem campos de texto.");
        return;
      }

      console.log("🚀 SGL Extension: Dados encontrados! Injetando widget...", data);
      createFloatingWidget(data);
    });
  } catch (err) {
    // Erro comum: "Extension context invalidated" quando o desenvolvedor clica em "Recarregar Extensão"
    // Basta limpar o interval para parar de tentar ler o storage fantasma.
    clearInterval(intervalId);
    console.log("🚀 SGL Extension: Contexto invalidado (extensão atualizada). Por favor, atualize esta página.");
  }
}, 1000);

function createFloatingWidget(data) {
  if (document.getElementById('sgl-gov-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'sgl-gov-widget';
  
  widget.innerHTML = `
    <div class="sgl-header">
      🚀 Assistente SGL
    </div>
    <div class="sgl-body">
      <p>1. Clique no campo do site<br>2. Clique em <b>Colar</b></p>
      
      <div class="sgl-item">
        <div class="sgl-item-content">
          <span class="label">Nº Compra</span>
          <span class="value" title="${data.processo || 'N/A'}">${data.processo || 'N/A'}</span>
        </div>
        <button id="sgl-fill-processo" title="Preencher Processo">Colar</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);
  widgetCreated = true;

  document.getElementById('sgl-fill-processo').addEventListener('mousedown', (e) => {
    e.preventDefault();
    fillActiveInput(data.processo);
  });
}

function fillActiveInput(value) {
  if (!value || value === 'N/A') return;
  
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
    
    // Suporte a inputs normais e contentEditable (alguns frameworks usam isso)
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      // Método seguro para disparar eventos no React/Angular do Comprasnet
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, value);
      } else {
        el.value = value;
      }

      // Dispara eventos de mudança para o Framework de tela notar
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
      
      // Feedback visual rápido no campo
      const oldBg = el.style.backgroundColor;
      el.style.backgroundColor = '#dcfce7'; // Verde clarinho
      setTimeout(() => el.style.backgroundColor = oldBg, 1000);
      
    } else if (el.isContentEditable) {
      el.innerText = value;
    }

  } else {
    alert("SGL AVISO:\nPor favor, primeiro clique dentro da caixinha onde você quer digitar no site do Comprasnet, e então clique no botão mágico 'Preencher'.");
  }
}
