const axios = require('axios');
const API_KEY = process.env.SERP_API_KEY || "YOUR_API_KEY"; // from .env
async function run() {
  const q = 'site:cnpj.biz OR site:casadosdados.com.br ("atacadista" OR "distribuidor" OR "industria") "FRALDA" CE ';
  const res = await axios.get('https://serpapi.com/search', {
    params: { q, engine: 'google', api_key: API_KEY, num: 10, hl: 'pt', gl: 'br' }
  });
  console.log("Results found:", res.data.organic_results ? res.data.organic_results.length : 0);
  if (res.data.organic_results) {
      console.log(res.data.organic_results.map(r => r.title));
  }
}
run().catch(console.error);
