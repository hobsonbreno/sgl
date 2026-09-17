import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SyncFailure, SyncFailureSchema } from './schemas/sync-failure.schema';
import { SyncFailureLoggerService } from './sync-failure-logger.service';
import { SyncFailureController } from './sync-failure.controller';
import { SystemLog, SystemLogSchema } from './system-log/system-log.schema';
import { SystemLogService } from './system-log/system-log.service';
import { SystemLogController } from './system-log/system-log.controller';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseLoggerService } from './database-logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SyncFailure.name, schema: SyncFailureSchema },
      { name: SystemLog.name, schema: SystemLogSchema },
    ]),
  ],
  controllers: [SyncFailureController, SystemLogController],
  providers: [
    SyncFailureLoggerService, 
    SystemLogService,
    DatabaseLoggerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    }
  ],
  exports: [SyncFailureLoggerService, SystemLogService, DatabaseLoggerService],
})
export class ObservabilityModule {}
