const axios = require('axios');
axios.get('https://brasilapi.com.br/api/cnpj/v1/00000000000191').then(r => console.log(Object.keys(r.data))).catch(e => console.log(e.message));
