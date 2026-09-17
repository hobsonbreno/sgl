const fs = require('fs');
const path = 'backend/src/fornecedor/supplier-discovery.service.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  "const axios = require('axios');",
  "const axios = require('axios');\n          const https = require('https');"
);
code = code.replace(
  "const response = await axios.get('https://serpapi.com/search', {",
  "const response = await axios.get('https://serpapi.com/search', {\n              httpsAgent: new https.Agent({ family: 4 }),\n              timeout: 15000,"
);
fs.writeFileSync(path, code);
