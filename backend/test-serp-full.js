const axios = require('axios');
const API_KEY = process.env.SERP_API_KEY || "YOUR_API_KEY";
async function run() {
  const q = 'site:cnpj.biz OR site:casadosdados.com.br ("atacadista" OR "distribuidor" OR "industria") "ÁGUA MINERAL" CE ';
  const res = await axios.get('https://serpapi.com/search', {
    params: { q, engine: 'google', api_key: API_KEY, num: 10, hl: 'pt', gl: 'br' }
  });
  if (res.data.organic_results) {
      console.log(JSON.stringify(res.data.organic_results, null, 2));
  }
}
run().catch(console.error);
