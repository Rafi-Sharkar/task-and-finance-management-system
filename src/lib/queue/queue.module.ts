import { QueueName } from '@/common/enum/queue-name.enum';
import { SmNotificationModule } from '@/main/sm-notification/sm-notification.module';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module, forwardRef } from '@nestjs/common';
import { CloudinaryService } from '../file/services/cloudinary.service';
import { MailModule } from '../mail/mail.module';
import { GenericEventsService } from './events/generic-events.service';
import { NotificationListener } from './listeners/notification.listener';

import { GenericTriggerService } from './trigger/generic-trigger.service';

import { MailWorkerService } from './worker/mail-worker.service';
import { NotificationWorkerService } from './worker/notification-worker.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.NOTIFICATION },
      { name: QueueName.GENERIC },
      { name: QueueName.MAIL },
    ),
    MailModule,
    forwardRef(() => SmNotificationModule),
  ],
  providers: [
    GenericTriggerService,
    GenericEventsService,
    MailWorkerService,
    NotificationWorkerService,
    NotificationListener,
    CloudinaryService,
  ],
  exports: [BullModule, GenericTriggerService],
})
export class QueueModule {}
