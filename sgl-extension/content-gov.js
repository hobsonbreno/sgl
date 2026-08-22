// content-gov.js
console.log("🚀 SGL Extension: Assistente carregado no site do Governo.");

let widgetCreated = false;

// Observador para a página de Minhas Participações
const participacoesInterval = setInterval(() => {
  if (window.location.href.includes('comprasnet-web/seguro/fornecedor/compras')) {
    createSyncWidget();
  } else {
    const w = document.getElementById('sgl-sync-widget');
    if (w) w.remove();
    syncWidgetCreated = false;
  }
}, 1000);

// Lógica existente para preenchimento (Oportunidades)
const intervalId = setInterval(() => {
  if (widgetCreated) return;
  try {
    if (!chrome || !chrome.storage) {
      clearInterval(intervalId);
      return;
    }
    chrome.storage.local.get('sglActiveData', (result) => {
      if (chrome.runtime.lastError) {
        clearInterval(intervalId);
        return;
      }
      const data = result.sglActiveData;
      if (!data) return;
      if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) return;
      const hasInputs = document.querySelectorAll('input:not([type="hidden"]), textarea').length > 0;
      if (!hasInputs && window.location.href.includes('popup')) return;
      createFloatingWidget(data);
    });
  } catch (err) {
    clearInterval(intervalId);
  }
}, 1000);

let syncWidgetCreated = false;
function createSyncWidget() {
  if (syncWidgetCreated || document.getElementById('sgl-sync-widget')) return;
  
  const widget = document.createElement('div');
  widget.id = 'sgl-sync-widget';
  
  widget.innerHTML = `
    <div class="sgl-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      🚀 Sincronizar SGL
    </div>
    <div class="sgl-body">
      <p>Enviar rankings para o painel SGL.</p>
      <button id="sgl-start-sync" style="background: #10b981; margin-top: 10px;">Sincronizar Participações</button>
      <div id="sgl-sync-status" style="font-size: 11px; margin-top: 10px; color: #666; display: none;">Progresso: 0%</div>
    </div>
  `;
  document.body.appendChild(widget);
  syncWidgetCreated = true;

  document.getElementById('sgl-start-sync').addEventListener('click', async (e) => {
    e.preventDefault();
    await startScrapingParticipacoes();
  });
}

let debugLogs = [];
function logDebug(msg) {
  console.log(`[SGL DEBUG] ${msg}`);
  const status = document.getElementById('sgl-sync-status');
  if (status) {
      status.innerText = msg;
  }
  let consoleBox = document.getElementById('sgl-debug-console');
  if (!consoleBox) {
      consoleBox = document.createElement('div');
      consoleBox.id = 'sgl-debug-console';
      consoleBox.style = 'position:fixed; bottom:20px; left:20px; width:400px; max-height:250px; overflow-y:auto; background:#1e293b; color:#10b981; padding:15px; border-radius:12px; font-family:monospace; font-size:11px; z-index:999999; box-shadow:0 10px 25px rgba(0,0,0,0.5); border:1px solid #334155;';
      const title = document.createElement('div');
      title.innerText = 'SGL LOG TERMINAL';
      title.style = 'font-weight:bold; color:#fff; margin-bottom:10px; border-bottom:1px solid #334155; padding-bottom:5px;';
      consoleBox.appendChild(title);
      const content = document.createElement('div');
      content.id = 'sgl-debug-content';
      consoleBox.appendChild(content);
      document.body.appendChild(consoleBox);
  }
  const contentBox = document.getElementById('sgl-debug-content');
  const now = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.style = 'margin-bottom: 4px; line-height:1.4;';
  line.innerText = `[${now}] ${msg}`;
  contentBox.appendChild(line);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

window.startScrapingParticipacoes = async function startScrapingParticipacoes() {
  console.log("=========================================");
  console.log("Iniciando varredura profunda do Compras.gov...");
  console.log("=========================================");
  const btn = document.getElementById('sgl-start-sync');
  const status = document.getElementById('sgl-sync-status');
  btn.disabled = true;
  btn.innerText = 'Sincronizando...';
  status.style.display = 'block';

  try {
    
    const pregoesMap = new Map();
    const pregoesProcessadosGlobais = new Set();
    let hasMorePregoes = true;
    let fallbackLoopSafety = 0;

    logDebug('Iniciando varredura com paginação universal...');

    while (hasMorePregoes && fallbackLoopSafety < 100) {
        fallbackLoopSafety++;
        await wait(2000);
        
        let pregoesAtuais = Array.from(document.querySelectorAll('app-card-compra-pesquisa')).filter(r => r.innerText && r.innerText.toUpperCase().includes('PREGÃO'));
        
        let foundUnprocessedOnThisPage = null;
        for (let pRow of pregoesAtuais) {
            let txt = pRow.innerText || "";
            let match = txt.match(/Nº:?\s*(\d+\/\d+)/i) || txt.match(/(\d{1,5}\/\d{4})/);
            let uasgMatch = txt.match(/UASG:?\s*(\d+)/i) || txt.match(/(\d{6})/);
            
            let uasgStr = uasgMatch ? uasgMatch[1] : 'Unknown';
            let pregaoNumStr = match ? match[1] : txt.substring(0, 20);
            let pId = `${uasgStr}-${pregaoNumStr}`;
            
            if (!pregoesProcessadosGlobais.has(pId)) {
                foundUnprocessedOnThisPage = { row: pRow, id: pId, uasg: uasgStr, pregao: pregaoNumStr };
                break;
            }
        }

        if (foundUnprocessedOnThisPage) {
            const pId = foundUnprocessedOnThisPage.id;
            const uasg = foundUnprocessedOnThisPage.uasg;
            const pregaoNum = foundUnprocessedOnThisPage.pregao;
            const pRow = foundUnprocessedOnThisPage.row;
            
            logDebug(`Processando Pregão ${pregaoNum} (UASG: ${uasg})...`);
            pregoesProcessadosGlobais.add(pId);
            
            const icon = pRow.querySelector('.fa-plus-square.fas');
            if (icon) icon.click();
            else {
                const btn = pRow.querySelector('button');
                if (btn) btn.click();
            }
            
            await wait(4000);
            
            // FILTRAR POR ITENS PARTICIPADOS ANTES DE LER
            const comboboxes = Array.from(document.querySelectorAll('[role="combobox"], .p-dropdown-label, .p-select-label'));
            const currentFilter = comboboxes.find(el => el.innerText && el.innerText.includes('Itens em que estou participando'));
            
            if (!currentFilter) {
                const filterTodos = comboboxes.find(el => el.innerText && (el.innerText.includes('Todos os Itens') || el.innerText.includes('Selecione')));
                if (filterTodos) {
                    logDebug('Aplicando filtro: Itens em que estou participando...');
                    filterTodos.click();
                    await wait(1000);
                    const optionParticipando = Array.from(document.querySelectorAll('li, p-dropdownitem, [role="option"]')).find(el => el.innerText && el.innerText.includes('Itens em que estou participando'));
                    if (optionParticipando) {
                        optionParticipando.click();
                        await wait(3500); // Espera a lista de itens recarregar filtrada
                    }
                }
            }
            
            const itensEncontrados = [];
            const iconsItem = Array.from(document.querySelectorAll('.fa-plus-square.fas')).filter(el => el.closest('div[class*="item"]') || el.closest('.row') || el.closest('app-acompanhamento-compra-fornecedor-itens'));
            
            for (let i = 0; i < iconsItem.length; i++) {
                logDebug(`Lendo Item ${i+1}/${iconsItem.length}...`);
                
                
                const iIcon = Array.from(document.querySelectorAll('.fa-plus-square.fas')).filter(el => el.closest('div[class*="item"]') || el.closest('.row') || el.closest('app-acompanhamento-compra-fornecedor-itens'))[i];
                if (!iIcon) continue;
                
                const itemRow = iIcon.closest('.row') || iIcon.closest('div[class*="item"]');
                let itemDescricao = `Item ${i+1}`;
                let rowText = '';
                
                if (itemRow) {
                    const tituloEl = itemRow.querySelector('.font-weight-bold') || itemRow.querySelector('div.col-sm-12 span');
                    if (tituloEl && tituloEl.innerText.length > 3) itemDescricao = tituloEl.innerText.trim();
                    else {
                        const linhasTexto = itemRow.innerText.split('\n').map(l => l.trim()).filter(l => l && l.length > 2);
                        if (linhasTexto.length > 0) itemDescricao = linhasTexto[0];
                    }
                    
                    rowText = itemRow.innerText.toLowerCase();
                    if (rowText.includes('homologado') || rowText.includes('adjudicad') || rowText.includes('habilitado') || rowText.includes('cancelado') || rowText.includes('fracassado')) {
                        logDebug(`O Item ${i+1} está encerrado ou cancelado. Ignorando...`);
                        continue;
                    }
                    
                    if (rowText.includes('não particip') || rowText.includes('sem proposta')) {
                        logDebug(`O Item ${i+1} não tem sua participação. Ignorando...`);
                        continue;
                    }
                }

                iIcon.click();
                await wait(2000); // Mais rápido

                let chatTxt = '', propostaTxt = '', anexosTxt = '', faseRecursalTxt = '', diligenciasTxt = '';
                
                
                
                const titulosAbertos = Array.from(document.querySelectorAll('span.cp-texto-titulo, .p-accordion-header-text, mat-panel-title'));
                const clickedElements = new Set();
                
                for (const tituloEl of titulosAbertos) {
                    const titulo = tituloEl.textContent.toLowerCase().trim();
                    if (!titulo) continue;
                    
                    const parentBlock = tituloEl.closest('p-accordiontab, mat-expansion-panel, .card, div[class*="accordion"]');
                    
                    // Click para abrir se não foi clicado
                    if (!parentBlock || !clickedElements.has(parentBlock)) {
                        if (parentBlock) clickedElements.add(parentBlock);
                        const setaIcon = parentBlock ? parentBlock.querySelector('i.fa-angle-down, .p-accordion-toggle-icon') : null;
                        if (setaIcon) setaIcon.click();
                        else tituloEl.click();
                        await wait(800); // Dar tempo para a animação de abertura
                    }
                    
                    // Extração do conteúdo
                    let conteudo = '';
                    const container = parentBlock || tituloEl.parentElement.parentElement.parentElement;
                    if (container) {
                        const contentEl = container.querySelector('.p-accordion-content, .ui-accordion-content, .mat-expansion-panel-body, [id^="p-accordiontab"]');
                        if (contentEl) {
                            conteudo = contentEl.innerText || contentEl.textContent;
                        } else {
                            // Tentar achar qualquer div genérica de conteúdo
                            conteudo = container.innerText || container.textContent;
                            if (conteudo) conteudo = conteudo.replace(tituloEl.innerText || tituloEl.textContent, '');
                        }
                    }
                    
                    if (!conteudo || conteudo.length < 5) {
                        // Fallback agressivo: pegar todos os blocos de conteúdo visíveis na página e pegar o último modificado/aberto
                        const allContents = Array.from(document.querySelectorAll('.p-accordion-content, .ui-accordion-content, .mat-expansion-panel-body, .card-body'));
                        const visible = allContents.filter(el => el.offsetParent !== null && (el.innerText || '').length > 0);
                        if (visible.length > 0) conteudo = visible[visible.length - 1].innerText;
                    }
                    
                    conteudo = conteudo ? conteudo.trim() : '';
                    if (titulo.includes('chat')) chatTxt = conteudo;
                    else if (titulo.includes('proposta')) propostaTxt = conteudo;
                    else if (titulo.includes('anexo')) anexosTxt = conteudo;
                    else if (titulo.includes('fase recursal') || titulo.includes('recurso')) faseRecursalTxt = conteudo;
                    else if (titulo.includes('diligência') || titulo.includes('diligencia')) diligenciasTxt = conteudo;
                }

                // Clicar na aba "Todas as propostas"
                const tabsTodas = Array.from(document.querySelectorAll('p-tab, a, button, span, li, div')).filter(el => 
                    el.textContent && el.textContent.toLowerCase().includes('todas as propostas')
                );
                // Prioriza P-TAB se existir, senao pega o primeiro
                const abaTodas = tabsTodas.find(el => el.tagName === 'P-TAB') || tabsTodas.find(el => el.getAttribute('role') === 'tab') || tabsTodas[0];
                
                if (abaTodas) {
                    abaTodas.click();
                    await wait(3500); // Esperar a tabela carregar
                }
                let competidores = [];
                let temMaisPropostas = true;
                let pageSafety = 0;
                
                while (temMaisPropostas && pageSafety < 20) {
                    const linhasPropostas = Array.from(document.querySelectorAll('table tbody tr, .proposta-row, app-proposta-fornecedor, p-table tr, .p-datatable-tbody > tr, tr.ui-widget-content, .p-treetable-tbody > tr'));
                    
                    linhasPropostas.forEach(linha => {
                        const texto = linha.innerText;
                        if (texto.trim().length > 10) {
                            const ehInvalida = texto.match(/desclassificad[ao]|inabilitad[ao]|recusad[ao]|cancelad[ao]/i);
                            const cnpjMatch = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                            const cnpj = cnpjMatch ? cnpjMatch[0] : 'Desconhecido';
                            
                            const posMatch = texto.match(/(\d+)º/);
                            const posicao = posMatch ? parseInt(posMatch[1]) : 999;
                            
                            competidores.push({
                                textoBruto: texto,
                                cnpj: cnpj,
                                status: ehInvalida ? 'Inabilitada' : 'Ativa',
                                posicaoMarcada: posicao
                            });
                        }
                    });
                    
                    const nextBtns = Array.from(document.querySelectorAll('button.p-paginator-next:not(.p-disabled)'));
                    const nextBtnPropostas = nextBtns.length > 0 ? nextBtns[nextBtns.length - 1] : null;
                    
                    if (nextBtnPropostas) {
                        nextBtnPropostas.click();
                        await wait(1500);
                        pageSafety++;
                    } else {
                        temMaisPropostas = false;
                    }
                }
                
                const meuCnpj = '48.262.939/0001-50';
                let posicaoReal = 1;
                let achouNossaEmpresa = false;
                
                const competidoresUnicos = [];
                const cnpjsVistos = new Set();
                for (const c of competidores) {
                    if (c.cnpj !== 'Desconhecido' && cnpjsVistos.has(c.cnpj)) continue;
                    cnpjsVistos.add(c.cnpj);
                    competidoresUnicos.push(c);
                }
                
                for (const comp of competidoresUnicos) {
                    if (comp.textoBruto.includes(meuCnpj) || comp.textoBruto.includes('48262939000150') || comp.textoBruto.includes('GRUPO IRMAOS NASCIMENTO')) {
                        achouNossaEmpresa = true;
                        break;
                    }
                    if (comp.status === 'Ativa') {
                        posicaoReal++;
                    }
                }
                
                if (!achouNossaEmpresa) {
                    // Fallback agressivo: Buscar o CNPJ no texto puro da tela e ver qual é a ordem dele!
                    const allText = document.querySelector('p-tabpanel, .p-tabview-panels, p-table, table')?.innerText || document.body.innerText;
                    if (allText.includes(meuCnpj) || allText.includes('48262939000150') || allText.includes('GRUPO IRMAOS NASCIMENTO')) {
                        achouNossaEmpresa = true;
                        const cnpjsMatches = allText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
                        if (cnpjsMatches) {
                            const uniqueCnpjs = [...new Set(cnpjsMatches)];
                            const myIndex = uniqueCnpjs.indexOf(meuCnpj);
                            if (myIndex !== -1) posicaoReal = myIndex + 1; // Posição pela ordem visual!
                            else posicaoReal = 1;
                        } else {
                            posicaoReal = 1; // Se achou o nome mas não o CNPJ formatado
                        }
                    } else {
                        posicaoReal = 999;
                    }
                } else if (posicaoReal === 1 || posicaoReal === 999) {
                     // Achou a empresa, mas a posição não foi extraída corretamente (faltou o 'º' ou similar)
                     const allText = document.querySelector('p-tabpanel, .p-tabview-panels, p-table, table')?.innerText || document.body.innerText;
                     const cnpjsMatches = allText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
                     if (cnpjsMatches) {
                         const uniqueCnpjs = [...new Set(cnpjsMatches)];
                         const myIndex = uniqueCnpjs.indexOf(meuCnpj);
                         if (myIndex !== -1) posicaoReal = myIndex + 1;
                     }
                }

                itensEncontrados.push({
                    itemId: itemDescricao,
                    nossaPosicao: posicaoReal,
                    status: 'Ativo',
                    chat: chatTxt,
                    proposta: propostaTxt,
                    anexos: anexosTxt,
                    faseRecursal: faseRecursalTxt,
                    diligencias: diligenciasTxt,
                    competidores: competidoresUnicos
                });

                const btnVoltarItem = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Voltar') && !b.disabled);
                if (btnVoltarItem) btnVoltarItem.click();
                else {
                    const btnClose = document.querySelector('button.p-dialog-header-close');
                    if (btnClose) btnClose.click();
                }
                await wait(1500); // Reduzido de 2s para 1.5s
            }
            
            if (itensEncontrados.length >= 0) {
                await fetch('http://localhost:7005/compras-gov-monitor/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([{
                        id: pId,
                        uasg,
                        pregao: pregaoNum,
                        itens: itensEncontrados
                    }])
                }).catch(e => logDebug(`Erro ao enviar Pregão ${pregaoNum}: ${e.message}`));
            }
            
            const btnHome = document.querySelector('.fa-home') || document.querySelector('.opcao-home');
            if (btnHome) {
                logDebug('Clicando em Home para voltar...');
                btnHome.click();
            } else {
                const btnVoltarPregao = Array.from(document.querySelectorAll('button')).find(b => (b.innerText?.trim() === 'Voltar' || b.classList.contains('is-secondary')) && !b.disabled);
                if (btnVoltarPregao) btnVoltarPregao.click();
                else window.history.back();
            }
            await wait(4000);
            
        } else {
            const nextBtns = Array.from(document.querySelectorAll('button.p-paginator-next:not(.p-disabled)'));
            const mainPaginator = nextBtns.length > 0 ? nextBtns[0] : null;
            if (mainPaginator) {
                logDebug('Indo para a próxima página de pregões...');
                mainPaginator.click();
                await wait(4000);
            } else {
                logDebug('Fim da lista de pregões (Sem mais páginas).');
                hasMorePregoes = false;
            }
        }
    }

    logDebug('Varredura completa!');
    btn.innerText = 'Sincronizado!';
    btn.style.background = '#059669';
    setTimeout(() => {
      btn.innerText = 'Sincronizar Participações';
      btn.style.background = '#10b981';
      btn.disabled = false;
      document.getElementById('sgl-debug-console').style.display = 'none';
    }, 4000);
    
  } catch(e) {
    console.error("SGL Sync Error:", e);
    logDebug('ERRO FATAL: ' + e.message);
    btn.disabled = false;
    btn.innerText = 'Tentar Novamente';
    btn.style.background = '#ef4444';
  }
}

function createFloatingWidget(data) {
  if (document.getElementById('sgl-gov-widget')) return;
  const widget = document.createElement('div');
  widget.id = 'sgl-gov-widget';
  widget.innerHTML = `
    <div class="sgl-header">🚀 Assistente SGL</div>
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
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
      const oldBg = el.style.backgroundColor;
      el.style.backgroundColor = '#dcfce7';
      setTimeout(() => el.style.backgroundColor = oldBg, 1000);
    } else if (el.isContentEditable) {
      el.innerText = value;
    }
  } else {
    alert("SGL AVISO:\nPor favor, primeiro clique dentro da caixinha onde você quer digitar no site do Comprasnet, e então clique no botão mágico 'Preencher'.");
  }
}
