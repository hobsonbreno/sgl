const http = require('http');

http.get('http://localhost:7005/fornecedores/enriquecer-cnpj/00000000000191', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
