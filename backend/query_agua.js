const mongoose = require('mongoose');

// Tenta conectar no banco de dados localmente (licitacoes)
mongoose.connect('mongodb://localhost:27017/licitacoes', { serverSelectionTimeoutMS: 2000 }).then(async () => {
    const db = mongoose.connection;
    const items = await db.collection('produtos').find({
        descricao: { $regex: /AGUA/i }
    }).project({
        valorUnitarioEstimado: 1, descricao: 1, oportunidadeId: 1
    }).limit(20).toArray();
    
    console.log("=== Produtos encontrados (AGUA) na coleção 'licitacoes.produtos' ===");
    console.log(JSON.stringify(items, null, 2));

    process.exit(0);
}).catch(async (e) => {
    console.log("Failed to connect to /licitacoes, trying /sgl...");
    try {
        await mongoose.connect('mongodb://localhost:27017/sgl', { serverSelectionTimeoutMS: 2000 });
        const db = mongoose.connection;
        const items = await db.collection('produtos').find({
            descricao: { $regex: /AGUA/i }
        }).project({
            valorUnitarioEstimado: 1, descricao: 1
        }).limit(20).toArray();
        console.log("=== Produtos encontrados (AGUA) na coleção 'sgl.produtos' ===");
        console.log(JSON.stringify(items, null, 2));
        process.exit(0);
    } catch(err) {
        console.error("Connection failed:", err.message);
        process.exit(1);
    }
});
