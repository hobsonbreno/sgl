const axios = require('axios');
const API_KEY = "8338d71376668694f8360ccb68aa678af450deaa344450f1cac387332f0f7a4a";
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
