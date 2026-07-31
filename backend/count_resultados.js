const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/licitacoes', { serverSelectionTimeoutMS: 2000 }).then(async () => {
    const db = mongoose.connection;
    try {
        const count = await db.collection('resultadoitems').countDocuments();
        console.log("Count in resultadoitems:", count);
    } catch(e) {
        console.log("Count in resultadoitems: 0 (collection probably does not exist yet)");
    }
    process.exit(0);
}).catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
});
