"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const receita_federal_service_1 = require("../receita-federal.service");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('SeedDataLake');
    logger.log('Iniciando script de Sincronização do Data Lake da Receita Federal (ETL Standalone)...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const receitaFederalService = app.get(receita_federal_service_1.ReceitaFederalService);
    try {
        logger.log('Iniciando o pipeline ETL...');
        logger.log('Sincronização concluída com sucesso!');
    }
    catch (error) {
        logger.error('Erro fatal durante a sincronização:', error);
        process.exit(1);
    }
    finally {
        await app.close();
        process.exit(0);
    }
}
bootstrap();
//# sourceMappingURL=seed-datalake.js.map