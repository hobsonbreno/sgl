// content-gov.js
console.log("🚀 SGL Extension: Assistente carregado no site do Governo.");

let widgetCreated = false;

// Observador para a página de Minhas Participações
let isAutoSyncing = false;
const participacoesInterval = setInterval(async () => {
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
}, 5000);

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
    <div class="sgl-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: flex; justify-content: space-between; align-items: center;">
      <span>🚀 SGL Auto-Sync</span>
    </div>
    <div class="sgl-body">
      <p>Buscando rankings de forma invisível.</p>
      <div id="sgl-start-sync" style="background: #10b981; padding: 5px 10px; border-radius: 4px; color: white; margin-top: 10px; text-align: center; font-size: 12px;">Monitorando a cada 1 hora</div>
      <button id="sgl-pause-btn" style="width: 100%; margin-top: 10px; padding: 5px; background: #eab308; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Pausar Varredura</button>
      <div id="sgl-sync-status" style="font-size: 11px; margin-top: 10px; color: #666; display: none;">Progresso: 0%</div>
    </div>
  `;
  document.body.appendChild(widget);
  syncWidgetCreated = true;
  
  document.getElementById('sgl-pause-btn').addEventListener('click', (e) => {
    window.sglPaused = !window.sglPaused;
    e.target.innerText = window.sglPaused ? 'Retomar Varredura' : 'Pausar Varredura';
    e.target.style.background = window.sglPaused ? '#3b82f6' : '#eab308';
    if (window.sglPaused) {
        logDebug('Varredura PAUSADA pelo usuário.');
    } else {
        logDebug('Varredura RETOMADA.');
    }
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

window.sglPaused = false;

window.startScrapingParticipacoes = async function startScrapingParticipacoes() {
  console.log("=========================================");
  console.log("Iniciando varredura profunda do Compras.gov...");
  console.log("=========================================");
  const status = document.getElementById('sgl-sync-status');
  if (status) status.style.display = 'block';

  try {
    
    const pregoesMap = new Map();
    const pregoesProcessadosGlobais = new Set();
    let hasMorePregoes = true;
    let fallbackLoopSafety = 0;

    logDebug('Iniciando varredura com paginação universal...');

    while (hasMorePregoes && fallbackLoopSafety < 100) {
        while (window.sglPaused) await wait(1000); // Aguarda se estiver pausado
        
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
            const getAllItemIcons = () => {
                const icons = Array.from(document.querySelectorAll('.fa-plus-square.fas, .fa-plus-square, .fa-plus, button[title*="Detalhar"], .fa-chevron-down')).filter(el => {
                    const row = el.closest('div[class*="item"], .row, tr, .br-item'); // Removido 'app-acompanhamento-compra-fornecedor-itens' que englobava todos
                    if (row && (row.innerText.toLowerCase().includes('grupo ') || row.innerText.toLowerCase().includes('lote '))) {
                        return row.innerText.toLowerCase().includes('item');
                    }
                    return row !== null;
                });
                // Remover duplicatas da mesma linha (pegar o primeiro ícone útil de cada item)
                const uniqueIcons = [];
                const seenRows = new Set();
                for (let icon of icons) {
                    const row = icon.closest('div[class*="item"], .row, tr, .br-item');
                    if (!seenRows.has(row)) {
                        seenRows.add(row);
                        uniqueIcons.push(icon);
                    }
                }
                return uniqueIcons;
            };

            const iconsItem = getAllItemIcons();
            
            for (let i = 0; i < iconsItem.length; i++) {
                while (window.sglPaused) await wait(1000); // Aguarda se estiver pausado no meio de um pregão
                
                logDebug(`Lendo Item ${i+1}/${iconsItem.length}...`);
                
                // Recalcula o elemento pois o DOM pode ter mudado
                const currentIcons = getAllItemIcons();
                
                const iIcon = currentIcons[i];
                if (!iIcon) continue;
                
                const itemRow = iIcon.closest('app-item-fornecedor, div.cp-itens-card, .br-item, div.item-linha') || iIcon.closest('.row');
                let itemDescricao = `Item ${i+1}`;
                let rowText = '';
                let itemStatus = 'Ativo';
                
                if (itemRow) {
                    const tituloEl = itemRow.querySelector('[data-test*="titulo"], [data-test*="nome"], .cp-texto-titulo, .font-weight-bold, .titulo-item, div.col-sm-12 span, .br-item-header');
                    if (tituloEl && tituloEl.innerText.length > 3 && !tituloEl.innerText.toLowerCase().includes('aguardando')) {
                        itemDescricao = tituloEl.innerText.trim();
                    } else {
                        // Fallback: pega a primeira linha grande que não seja um rótulo genérico
                        const linhasTexto = itemRow.innerText.split('\n').map(l => l.trim()).filter(l => l && l.length > 2 && !l.toLowerCase().includes('aguardando') && !l.toLowerCase().includes('qtde') && !l.toLowerCase().includes('valor') && !l.toLowerCase().includes('situação'));
                        if (linhasTexto.length > 0) itemDescricao = linhasTexto[0];
                    }
                    
                    rowText = itemRow.innerText.toLowerCase();
                    
                    if (rowText.includes('homologado')) itemStatus = 'Homologado';
                    else if (rowText.includes('adjudicad')) itemStatus = 'Adjudicado';
                    else if (rowText.includes('habilitado')) itemStatus = 'Habilitado';
                    else if (rowText.includes('cancelado')) itemStatus = 'Cancelado';
                    else if (rowText.includes('fracassado')) itemStatus = 'Fracassado';
                    else if (rowText.includes('desclassificad')) itemStatus = 'Desclassificado';
                    else if (rowText.includes('inabilitad')) itemStatus = 'Inabilitado';
                    else if (rowText.includes('revogado')) itemStatus = 'Revogado';
                    else if (rowText.includes('aguardando julgamento')) itemStatus = 'Aguardando julgamento';
                    else if (rowText.includes('aberto para lances')) itemStatus = 'Aberto para lances';
                    
                    if (rowText.includes('não particip') || rowText.includes('sem proposta')) {
                        logDebug(`O Item ${i+1} não tem sua participação. Ignorando...`);
                        continue;
                    }
                }

                logDebug(`Abrindo Item ${itemDescricao}...`);
                iIcon.click();
                await wait(4000); 
                
                // Melhoria: Se o nome estiver genérico ("Item 8"), caçar o nome real dentro da tela que acabou de abrir
                if (itemDescricao.match(/^Item\s+\d+$/i)) {
                    const possibleTitles = Array.from(document.querySelectorAll('.p-dialog-title, app-resumo-item h3, app-item-fornecedor-header h3, .modal-title, [data-test*="descricao"], [data-test*="nome"], span.text-uppercase'));
                    for (const pt of possibleTitles) {
                        const t = pt.innerText.trim();
                        if (t.length > 5 && !t.toLowerCase().includes('chat') && !t.toLowerCase().includes('proposta') && !t.toLowerCase().includes('anexo') && !t.match(/^Item\s+\d+$/i)) {
                            itemDescricao = `${itemDescricao} - ${t}`;
                            break; // Pega o primeiro bom título e sai
                        }
                    }
                }

                let chatTxt = '', propostaTxt = '', anexosTxt = '', faseRecursalTxt = '', diligenciasTxt = '';
                
                // Encontrar os cabeçalhos das seções (mais abrangente para capturar Proposta, Anexos, etc)
                const headers = Array.from(document.querySelectorAll('.cp-texto-titulo, span.title, .br-accordion-header .title, .accordion-header, h3, .p-accordion-header-text'));

                for (const headerEl of headers) {
                    const titulo = (headerEl.innerText || headerEl.textContent).toLowerCase().trim();
                    if (!titulo) continue;

                    // Achar o elemento clicável: pode ser o botão pai, link pai, ou a si próprio
                    const clickable = headerEl.closest('button, a, .br-button, .header, .p-panel-header') || headerEl;
                    
                    // Verificar se já está aberto para não fechar acidentalmente
                    const isExpanded = clickable.getAttribute('aria-expanded') === 'true' || 
                                       (clickable.parentElement && clickable.parentElement.getAttribute('aria-expanded') === 'true');
                    
                    if (!isExpanded) {
                        clickable.click();
                        await wait(3500); // Aumentado de 1000 para 3500 para evitar bloqueio WAF 403 (muitos cliques seguidos)
                    }
                }

                await wait(3500); // Aumentado para dar tempo ao servidor de responder os 5 acordeons
                
                for (const headerEl of headers) {
                    const titulo = (headerEl.innerText || headerEl.textContent).toLowerCase().trim();
                    if (!titulo) continue;
                    
                    // Tentar achar o container estruturado do item
                    let container = headerEl.closest('.br-accordion .item, p-accordiontab, mat-expansion-panel, .accordion-item, p-accordion .card, div[class*="accordion-tab"], .br-item, p-panel');
                    let conteudo = '';
                    
                    if (container) {
                        const contentEl = container.querySelector('.p-accordion-content, .mat-expansion-panel-body, .accordion-body, .ui-accordion-content, .p-toggleable-content, .card-body, .collapse, .content');
                        if (contentEl) {
                            conteudo = (contentEl.innerText || contentEl.textContent).trim();
                        } else {
                            const fullText = (container.innerText || container.textContent).trim();
                            const titleText = (headerEl.innerText || headerEl.textContent).trim();
                            conteudo = fullText.replace(titleText, '').trim();
                        }
                    } else {
                        // Se não achou container pai estruturado, tenta pegar o elemento irmão (next sibling content)
                        let parent = headerEl.parentElement;
                        while (parent && !parent.nextElementSibling && parent.tagName !== 'BODY') {
                            parent = parent.parentElement;
                        }
                        if (parent && parent.nextElementSibling) {
                            conteudo = (parent.nextElementSibling.innerText || parent.nextElementSibling.textContent).trim();
                        }
                    }
                    
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
                    
                    logDebug('Rolando para baixo para forçar carregamento das propostas (Scroll)...');
                    for (let s = 0; s < 8; s++) {
                        // Método 1: ScrollIntoView no último item renderizado (força o Angular a carregar mais)
                        const rows = document.querySelectorAll('div[data-test="propostaItemEmSelecaoFornecedores"], .cp-itens-card, tr, app-identificacao-e-situacao-participante-no-item');
                        if (rows.length > 0) {
                            const lastRow = rows[rows.length - 1];
                            if (lastRow && lastRow.scrollIntoView) {
                                lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            }
                        }
                        
                        // Método 2: Jogar todos os containers roláveis para o limite máximo (Bottom)
                        const scrollTargets = document.querySelectorAll('.p-dialog-content, .modal-body, cdk-virtual-scroll-viewport, .scroll-content, .br-modal-body, main, div[style*="overflow"]');
                        scrollTargets.forEach(el => {
                            if (el && el.scrollHeight) {
                                el.scrollTop = el.scrollHeight + 1000;
                            }
                        });
                        
                        // Método 3: Janela inteira
                        window.scrollTo(0, document.body.scrollHeight + 1000);
                        
                        await wait(1500);
                    }
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
                    const linhasPropostas = Array.from(document.querySelectorAll('table tbody tr, .proposta-row, app-proposta-fornecedor, p-table tr, .p-datatable-tbody > tr, tr.ui-widget-content, .p-treetable-tbody > tr, div[data-test="propostaItemEmSelecaoFornecedores"], div.cp-itens-card, app-identificacao-e-situacao-participante-no-item'));
                    
                    linhasPropostas.forEach(linha => {
                        const texto = linha.innerText;
                        if (texto.trim().length > 10) {
                            const cnpjMatch = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                            
                            // Apenas processa se for realmente uma linha com CNPJ (evita contar headers ou quebras vazias)
                            if (cnpjMatch || texto.includes('GRUPO IRMAOS NASCIMENTO') || texto.includes('48262939000150')) {
                                const ehInvalida = texto.match(/desclassificad[ao]|inabilitad[ao]|recusad[ao]|cancelad[ao]|inapt[ao]/i);
                                const cnpj = cnpjMatch ? cnpjMatch[0] : 'Desconhecido';
                                
                                // Extrair valor
                                let valor = null;
                                const matchValor = texto.match(/R\$\s*([\d.,]+)/);
                                if (matchValor) {
                                    // Remove pontos e troca vírgula por ponto
                                    const rawStr = matchValor[1].replace(/\./g, '').replace(',', '.');
                                    valor = parseFloat(rawStr);
                                }
                                
                                competidores.push({
                                    textoBruto: texto,
                                    cnpj: cnpj,
                                    status: ehInvalida ? 'Desclassificada' : 'Ativa',
                                    valor: valor
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
                let nossaEmpresaStatus = 'Ativa';
                
                const competidoresUnicos = [];
                const cnpjsVistos = new Set();
                for (const c of competidores) {
                    if (c.cnpj !== 'Desconhecido' && cnpjsVistos.has(c.cnpj)) continue;
                    cnpjsVistos.add(c.cnpj);
                    competidoresUnicos.push(c);
                }
                
                for (let c_idx = 0; c_idx < competidoresUnicos.length; c_idx++) {
                    const comp = competidoresUnicos[c_idx];
                    if (comp.textoBruto.includes(meuCnpj) || comp.textoBruto.includes('48262939000150') || comp.textoBruto.includes('GRUPO IRMAOS NASCIMENTO')) {
                        achouNossaEmpresa = true;
                        nossaEmpresaStatus = comp.status;
                        break;
                    }
                    const isInvalida = comp.textoBruto.match(/desclassificad[ao]|inabilitad[ao]|recusad[ao]|cancelad[ao]|inapt[ao]/i);
                    if (!isInvalida) {
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
                    nossaPosicao: achouNossaEmpresa ? posicaoReal : 999,
                    nossaEmpresaStatus: achouNossaEmpresa ? nossaEmpresaStatus : 'Desconhecida',
                    status: itemStatus,
                    chat: chatTxt,
                    proposta: propostaTxt,
                    anexos: anexosTxt,
                    faseRecursal: faseRecursalTxt,
                    diligencias: diligenciasTxt,
                    competidores: competidoresUnicos
                });

                // Prevenção de Fuga: Só clicar em "Voltar" se estivermos dentro de um modal ou página de Item
                const btnVoltarItem = Array.from(document.querySelectorAll('button')).find(b => 
                    b.innerText?.includes('Voltar') && 
                    !b.disabled && 
                    b.classList.contains('is-secondary')
                ) || Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Voltar') && !b.disabled);
                
                if (btnVoltarItem) {
                    btnVoltarItem.click();
                } else {
                    const btnClose = document.querySelector('button.p-dialog-header-close, .modal-close');
                    if (btnClose) btnClose.click();
                    else logDebug('Aviso: Botão Voltar do item não encontrado.');
                }
                await wait(3500); // Aumentado de 2500 para 3500 para transição suave de tela
            }
            
            if (itensEncontrados.length > 0) {
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
    setTimeout(() => {
      document.getElementById('sgl-debug-console').style.display = 'none';
    }, 4000);
    
  } catch(e) {
    console.error("SGL Sync Error:", e);
    logDebug('ERRO FATAL: ' + e.message);
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
