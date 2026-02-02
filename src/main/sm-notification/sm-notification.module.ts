import { Module, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '@/common/enum/queue-name.enum';
import { QueueModule } from '@/lib/queue/queue.module';
import { NotificationGateway } from './gateway/sm-notification.gateway';
import { NotificationController } from './sm-notification.controller';
import { NotificationService } from './sm-notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.NOTIFICATION,
    }),
    forwardRef(() => QueueModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, JwtService],
  exports: [NotificationService, NotificationGateway],
})
export class SmNotificationModule {}
