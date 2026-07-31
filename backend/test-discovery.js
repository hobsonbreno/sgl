const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { SupplierDiscoveryService } = require('./dist/fornecedor/supplier-discovery.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const discovery = app.get(SupplierDiscoveryService);
  
  console.log("Iniciando descoberta...");
  const results = await discovery.discoverSuppliersForProduct('FRALDA');
  console.log("Resultados:", results);
  
  await app.close();
  process.exit(0);
}
bootstrap();
