import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SmNotificationModule } from '../sm-notification/sm-notification.module';

import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [AuditModule, SmNotificationModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
