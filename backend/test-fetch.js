fetch('https://brasilapi.com.br/api/cnpj/v1/00000000000191', {
  headers: {
    'User-Agent': 'curl/7.68.0'
  }
})
  .then(res => res.json())
  .then(data => console.log("SUCCESS", data.razao_social))
  .catch(err => console.log(err));
