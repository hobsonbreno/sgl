import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Configuracao, ConfiguracaoSchema } from './configuracao.schema';
import { ConfiguracaoService } from './configuracao.service';
import { ConfiguracaoController } from './configuracao.controller';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Configuracao.name, schema: ConfiguracaoSchema },
    ]),
    forwardRef(() => BotModule),
  ],
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService],
  exports: [ConfiguracaoService],
})
export class ConfiguracaoModule {}
