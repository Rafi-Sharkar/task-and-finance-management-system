import { QueueName } from '@/common/enum/queue-name.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationGateway } from '@/main/sm-notification/gateway/sm-notification.gateway';

export interface NotificationJobData {
  userIds: string[];
  title: string;
  message: string;
  type: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Processor(QueueName.NOTIFICATION)
export class NotificationWorkerService extends WorkerHost {
  private readonly logger = new Logger(NotificationWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}`);

    try {
      const { userIds, title, message, type, entityId, metadata } = job.data;

      // Validate input
      if (!userIds || userIds.length === 0) {
        throw new Error('No user IDs provided');
      }

      if (!title || !message) {
        throw new Error('Title and message are required');
      }

      // Create notification record
      const notification = await this.prisma.client.smNotification.create({
        data: {
          userId: userIds[0], // Primary user (will be overridden by junction table)
          type,
          title,
          message,
          entityId,
          metadata: metadata || {},
        },
      });

      // Create notification-user junction records for all recipients
      const notificationUsers = await Promise.all(
        userIds.map((userId) =>
          this.prisma.client.smNotificationUser.create({
            data: {
              userId,
              notificationId: notification.id,
              type: this.mapTypeToEnum(type),
              read: false,
            },
          }),
        ),
      );

      this.logger.log(
        `Created notification ${notification.id} for ${userIds.length} users`,
      );

      // Send real-time notification via Socket.IO
      for (const userId of userIds) {
        await this.notificationGateway.sendNotificationToUser(userId, {
          id: notification.id,
          type,
          title,
          message,
          entityId,
          metadata: metadata || {},
          read: false,
          createdAt: notification.createdAt,
        });
      }

      this.logger.log(
        `Successfully sent real-time notifications to ${userIds.length} users`,
      );

      return {
        success: true,
        notificationId: notification.id,
        recipientCount: userIds.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process notification job ${job.id}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  private mapTypeToEnum(type: string): any {
    const typeMap: Record<string, string> = {
      USER_REGISTRATION: 'UserRegistration',
      TASK_ASSIGNMENT: 'ProjectAssignment',
      INVOICE_CREATED: 'Finance',
      DOCUMENT_APPROVAL: 'DocumentApproval',
      PAYMENT: 'Payment',
      SERVICE: 'Service',
      INQUIRY: 'Inquiry',
    };

    return typeMap[type] || null;
  }
}
