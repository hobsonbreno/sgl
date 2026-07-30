import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SyncFailure, SyncFailureSchema } from './schemas/sync-failure.schema';
import { SyncFailureLoggerService } from './sync-failure-logger.service';
import { SyncFailureController } from './sync-failure.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SyncFailure.name, schema: SyncFailureSchema },
    ]),
  ],
  controllers: [SyncFailureController],
  providers: [SyncFailureLoggerService],
  exports: [SyncFailureLoggerService],
})
export class ObservabilityModule {}
