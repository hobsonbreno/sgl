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
            
            // 1. Expandir todos os Grupos/Lotes preventivamente
            const possibleExpanders = Array.from(document.querySelectorAll('.fa-plus-square.fas'));
            let expandedAnyGroup = false;
            for (const exp of possibleExpanders) {
                const row = exp.closest('.row, div[class*="item"], tr, app-acompanhamento-compra-fornecedor-itens');
                if (row && (row.innerText.toLowerCase().includes('grupo') || row.innerText.toLowerCase().includes('lote'))) {
                    logDebug('Expandindo um Lote/Grupo...');
                    exp.click();
                    expandedAnyGroup = true;
                    await wait(1500);
                }
            }
            if (expandedAnyGroup) {
                await wait(1000); // Aguarda itens renderizarem
            }

            // 2. Coletar os ícones de item reais (incluindo os que acabaram de aparecer)
            const iconsItem = Array.from(document.querySelectorAll('.fa-plus-square.fas')).filter(el => {
                const row = el.closest('div[class*="item"], .row, app-acompanhamento-compra-fornecedor-itens, tr');
                if (row && (row.innerText.toLowerCase().includes('grupo ') || row.innerText.toLowerCase().includes('lote '))) {
                    return row.innerText.toLowerCase().includes('item');
                }
                return row !== null;
            });
            
            for (let i = 0; i < iconsItem.length; i++) {
                logDebug(`Lendo Item ${i+1}/${iconsItem.length}...`);
                
                // Recalcula o elemento pois o DOM pode ter mudado
                const currentIcons = Array.from(document.querySelectorAll('.fa-plus-square.fas')).filter(el => {
                    const row = el.closest('div[class*="item"], .row, app-acompanhamento-compra-fornecedor-itens, tr');
                    if (row && (row.innerText.toLowerCase().includes('grupo ') || row.innerText.toLowerCase().includes('lote '))) {
                        return row.innerText.toLowerCase().includes('item');
                    }
                    return row !== null;
                });
                
                const iIcon = currentIcons[i];
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
                
                // Encontrar apenas os elementos verdadeiros de accordion (sanfonas)
                const accordions = Array.from(document.querySelectorAll('p-accordiontab, mat-expansion-panel, .accordion-item, p-accordion .card, div[class*="accordion-tab"]'));
                const allAccordions = [...new Set(accordions)];

                for (const acc of allAccordions) {
                    const headerLink = acc.querySelector('a, .p-accordion-header-link, mat-expansion-panel-header, .accordion-button, .ui-accordion-header');
                    
                    // Se estiver fechado (ex: aria-expanded="false"), clica para abrir
                    if (headerLink && headerLink.getAttribute('aria-expanded') === 'false') {
                        headerLink.click();
                        await wait(500);
                    } else if (headerLink) {
                        // Tentar descobrir de outra forma se tá fechado (sem conteúdo visível)
                        const content = acc.querySelector('.p-accordion-content, .mat-expansion-panel-body, .accordion-body, .ui-accordion-content');
                        if (!content || content.offsetHeight === 0) {
                            headerLink.click();
                            await wait(500);
                        }
                    }
                }

                await wait(1000); // Dar tempo geral pra renderizar
                
                for (const acc of allAccordions) {
                    const headerEl = acc.querySelector('.p-accordion-header, mat-expansion-panel-header, .accordion-header, .ui-accordion-header, .cp-texto-titulo');
                    const titulo = headerEl ? (headerEl.innerText || headerEl.textContent).toLowerCase().trim() : '';
                    if (!titulo) continue;
                    
                    const contentEl = acc.querySelector('.p-accordion-content, .mat-expansion-panel-body, .accordion-body, .ui-accordion-content');
                    const conteudo = contentEl ? (contentEl.innerText || contentEl.textContent).trim() : '';
                    
                    // Atribui o conteúdo à variável certa se ainda estiver vazia
                    if (conteudo) {
                        if (titulo.includes('chat') && !chatTxt) chatTxt = conteudo;
                        else if (titulo.includes('proposta') && !propostaTxt) propostaTxt = conteudo;
                        else if (titulo.includes('anexo') && !anexosTxt) anexosTxt = conteudo;
                        else if ((titulo.includes('fase recursal') || titulo.includes('recurso')) && !faseRecursalTxt) faseRecursalTxt = conteudo;
                        else if ((titulo.includes('diligência') || titulo.includes('diligencia')) && !diligenciasTxt) diligenciasTxt = conteudo;
                    }
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
                } else {
                    logDebug(`Aba 'Todas as propostas' não encontrada (talvez Grupo/Lote). Ignorando aba...`);
                    const isModalOpen = document.querySelector('p-dialog, mat-dialog-container, .modal-dialog');
                    if (isModalOpen) {
                        const btnClose = document.querySelector('button.p-dialog-header-close');
                        if (btnClose) btnClose.click();
                    }
                    continue; // Pula este loop pois não é um item validamente aberto
                }
                let competidores = [];
                let temMaisPropostas = true;
                let pageSafety = 0;
                
                while (temMaisPropostas && pageSafety < 20) {
                    const linhasPropostas = Array.from(document.querySelectorAll('table tbody tr, .proposta-row, app-proposta-fornecedor, p-table tr, .p-datatable-tbody > tr, tr.ui-widget-content, .p-treetable-tbody > tr'));
                    
                    linhasPropostas.forEach(linha => {
                        const texto = linha.innerText;
                        if (texto.trim().length > 10) {
                            const cnpjMatch = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                            
                            // Apenas processa se for realmente uma linha com CNPJ (evita contar headers ou quebras vazias)
                            if (cnpjMatch || texto.includes('GRUPO IRMAOS NASCIMENTO') || texto.includes('48262939000150')) {
                                const ehInvalida = texto.match(/desclassificad[ao]|inabilitad[ao]|recusad[ao]|cancelad[ao]/i);
                                const cnpj = cnpjMatch ? cnpjMatch[0] : 'Desconhecido';
                                
                                competidores.push({
                                    textoBruto: texto,
                                    cnpj: cnpj,
                                    status: ehInvalida ? 'Inabilitada' : 'Ativa'
                                });
                            }
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
                    const allText = document.querySelector('p-tabpanel, .p-tabview-panels, p-table, table')?.innerText || document.body.innerText;
                    if (allText.includes(meuCnpj) || allText.includes('48262939000150') || allText.includes('GRUPO IRMAOS NASCIMENTO')) {
                        achouNossaEmpresa = true;
                        
                        // Heurística visual: Extrai CNPJs na ordem do texto e vê nossa posição na tela (subtraindo inabilitados encontrados antes)
                        const tudoAteAqui = allText.split(new RegExp(meuCnpj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|48262939000150|GRUPO IRMAOS NASCIMENTO'))[0];
                        const cnpjsMatches = tudoAteAqui.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
                        const desclassificacoes = (tudoAteAqui.match(/desclassificad[ao]|inabilitad[ao]|recusad[ao]|cancelad[ao]/gi) || []).length;
                        
                        if (cnpjsMatches) {
                            const uniqueCnpjs = [...new Set(cnpjsMatches)];
                            posicaoReal = uniqueCnpjs.length + 1 - desclassificacoes;
                            if (posicaoReal < 1) posicaoReal = 1;
                        } else {
                            posicaoReal = 1; 
                        }
                    } else {
                        posicaoReal = 999;
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

                // Prevenção de Fuga: Só clicar em "Voltar" se estivermos dentro de um modal de Item
                const isModalOpen = document.querySelector('p-dialog, mat-dialog-container, .modal-dialog');
                if (isModalOpen) {
                    const btnVoltarItem = Array.from(isModalOpen.querySelectorAll('button')).find(b => b.innerText?.includes('Voltar') && !b.disabled);
                    if (btnVoltarItem) btnVoltarItem.click();
                    else {
                        const btnClose = isModalOpen.querySelector('button.p-dialog-header-close, .modal-close');
                        if (btnClose) btnClose.click();
                    }
                } else {
                    logDebug('Aviso: Modal de item não detectado na hora de fechar.');
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
