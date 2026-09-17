const fs = require('fs');
const path = 'backend/src/fornecedor/supplier-discovery.service.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  "params: {",
  "headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },\n              params: {"
);
fs.writeFileSync(path, code);
