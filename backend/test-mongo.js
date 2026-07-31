const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/licitacoes').then(async () => {
    const db = mongoose.connection;
    const count = await db.collection('empresadatalakes').countDocuments();
    console.log("Count in empresadatalakes:", count);
    const count2 = await db.collection('empresadatalake').countDocuments();
    console.log("Count in empresadatalake:", count2);
    
    const count3 = await db.collection('empresasdatalake').countDocuments();
    console.log("Count in empresasdatalake:", count3);
    
    // List collections
    const collections = await db.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    process.exit(0);
}).catch(console.error);
