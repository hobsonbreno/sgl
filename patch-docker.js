const fs = require('fs');
let yml = fs.readFileSync('docker-compose.yml', 'utf8');
yml = yml.replace(/mongodb:\/\/host\.docker\.internal:7009/g, 'mongodb://mongo:27017');
fs.writeFileSync('docker-compose.yml', yml);
