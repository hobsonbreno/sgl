const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/licitacoes', { serverSelectionTimeoutMS: 2000 }).then(async () => {
    const db = mongoose.connection;
    try {
        const items = await db.collection('resultadoitems').find({}).limit(3).toArray();
        console.log(JSON.stringify(items, null, 2));
    } catch(e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}).catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
});
