const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if(res.statusCode >= 400) {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                } else if(res.statusCode === 204) {
                    resolve(null);
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch(e) { resolve(null); }
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        // Find a recent compra
        const url = 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataInicial=20260701&dataFinal=20260830&codigoModalidadeContratacao=1&pagina=1';
        console.log("Fetching compras...");
        const response = await fetch(url);
        const compras = response.data;
        if (!compras || compras.length === 0) {
            console.log("No compras found");
            return;
        }

        for (const compra of compras) {
            const [cnpjSeq, ano] = compra.numeroControlePNCP.split('/');
            const [cnpj, _, seq] = cnpjSeq.split('-');
            const itensUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens`;
            const itens = await fetch(itensUrl);
            if (!itens || itens.length === 0) continue;
            
            for (const item of itens) {
                const resultUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/itens/${item.numeroItem}/resultados`;
                const resultados = await fetch(resultUrl);
                if (resultados && Array.isArray(resultados) && resultados.length > 0) {
                    console.log("\n=== FOUND RESULTADOS JSON ===");
                    console.log(`URL: ${resultUrl}`);
                    console.log(JSON.stringify(resultados[0], null, 2));
                    return;
                }
            }
        }
        console.log("None found");
        
    } catch (e) {
        console.error(e);
    }
}

run();
