import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { OportunidadeModule } from '../oportunidade/oportunidade.module';
import { BotExecucao, BotExecucaoSchema } from '../bot/bot-execucao.schema';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    OportunidadeModule,
    forwardRef(() => BotModule),
    MongooseModule.forFeature([{ name: BotExecucao.name, schema: BotExecucaoSchema }])
  ],
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule {}
