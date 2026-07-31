const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if(res.statusCode >= 400) {
                    resolve(null);
                } else if(res.statusCode === 204) {
                    resolve(null);
                } else {
                    try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    const cnpj = '00489828000902';
    const ano = '2024';
    
    // Just try sequencial 1 to 100
    for(let seqNum = 1; seqNum <= 100; seqNum++) {
        const seq = seqNum.toString().padStart(6, '0');
        const compraUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}`;
        const compra = await fetch(compraUrl);
        if(!compra) continue;
        
        const itensUrl = `${compraUrl}/itens`;
        const itens = await fetch(itensUrl);
        if(!itens || !itens.length) continue;
        
        for(let item of itens) {
            const resUrl = `${itensUrl}/${item.numeroItem}/resultados`;
            const resultados = await fetch(resUrl);
            if(resultados && resultados.length > 0) {
                console.log("\n=== FOUND RESULT ===");
                console.log(resUrl);
                console.log(JSON.stringify(resultados[0], null, 2));
                return;
            }
        }
    }
    console.log("No results found in first 100 compras");
}

run();
