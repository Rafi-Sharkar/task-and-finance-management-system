import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GenericPayload } from '../interface/generic.payload';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor() {}

  @OnEvent(QueueEventsEnum.GENERIC)
  async handleNotificationEvent(payload: GenericPayload) {
    try {
      this.logger.log(
        `Processing generic notification event: ${JSON.stringify(payload)}`,
      );
      // This is for generic events - notifications are now handled by NotificationWorkerService
    } catch (error) {
      this.logger.error(
        `Failed to process generic event`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
