const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/licitacoes', { serverSelectionTimeoutMS: 2000 }).then(async () => {
    const db = mongoose.connection;
    
    // Pega 1 produto aleatório
    const produto = await db.collection('produtos').findOne({});
    if (!produto) {
        console.log("Nenhum produto encontrado");
        process.exit(0);
    }
    
    const opp = await db.collection('oportunidades').findOne({ _id: produto.oportunidadeId });
    if (!opp) {
        console.log("Nenhuma oportunidade encontrada para o produto");
        process.exit(0);
    }
    
    console.log("=== Produto e Oportunidade Encontrados ===");
    console.log("Produto:", JSON.stringify(produto, null, 2));
    console.log("Oportunidade:", JSON.stringify(opp, null, 2));

    process.exit(0);
}).catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
});
