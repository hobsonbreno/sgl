import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { OportunidadeModule } from '../oportunidade/oportunidade.module';
import { BotExecucao, BotExecucaoSchema } from '../bot/bot-execucao.schema';

@Module({
  imports: [
    OportunidadeModule,
    MongooseModule.forFeature([{ name: BotExecucao.name, schema: BotExecucaoSchema }])
  ],
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule {}
