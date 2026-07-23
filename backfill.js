const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('licitacoes');
  
  const produtos = await db.collection('produtos').find({ valorNossoLance: { $exists: true, $ne: 0 } }).toArray();
  for (const p of produtos) {
    if (p.descricao) {
      await db.collection('produtobases').updateOne(
        { descricaoItem: p.descricao },
        { $set: { descricaoItem: p.descricao, nossoLanceOficial: p.valorNossoLance } },
        { upsert: true }
      );
      console.log('Migrado:', p.descricao, p.valorNossoLance);
    }
  }
  
  await client.close();
  console.log('Terminado.');
}

run();
