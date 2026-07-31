import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupplierDiscoveryService } from './src/fornecedor/supplier-discovery.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const discovery = app.get(SupplierDiscoveryService);
  
  console.log("Iniciando descoberta...");
  const results = await discovery.discoverSuppliersForProduct('FRALDA', undefined);
  console.log("Resultados:", results);
  
  await app.close();
  process.exit(0);
}
bootstrap();
