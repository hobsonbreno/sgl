import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PncpClientService } from './services/pncp-client/pncp-client.service';
import { PncpController } from './controllers/pncp/pncp.controller';

@Module({
  imports: [HttpModule],
  providers: [PncpClientService],
  controllers: [PncpController],
  exports: [PncpClientService],
})
export class PncpModule {}
