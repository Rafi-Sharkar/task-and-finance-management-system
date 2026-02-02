import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from '../finance/dto/createNotification.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '@/common/enum/queue-name.enum';
import { NotificationJobData } from '@/lib/queue/worker/notification-worker.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  /**
   * Queue a notification to be sent to multiple users
   */
  async queueNotification(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Send notification to specific user (REST API)
   */
  @HandleError('Failed to send custom notification')
  async sendCustomNotification(
    userId: string,
    title: string,
    message: string,
  ): Promise<TResponse<any>> {
    await this.queueNotification({
      userIds: [userId],
      title,
      message,
      type: 'CUSTOM',
    });

    return successResponse(
      { userId, title, message },
      'Notification queued successfully',
    );
  }

  /**
   * Notify all admins and super admins (e.g., when a new user is created)
   */
  async notifyAdmins(title: string, message: string, metadata?: any) {
    const admins = await this.prisma.client.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: { id: true },
    });

    const adminIds = admins.map((admin) => admin.id);

    if (adminIds.length > 0) {
      await this.queueNotification({
        userIds: adminIds,
        title,
        message,
        type: 'USER_REGISTRATION',
        metadata,
      });
    }
  }

  /**
   * Notify task assignees and creator
   */
  async notifyTaskAssignment(
    taskId: string,
    creatorId: string,
    assigneeIds: string[],
    taskTitle: string,
  ) {
    // Combine creator and assignees, remove duplicates
    const uniqueUserIds = Array.from(new Set([creatorId, ...assigneeIds]));

    await this.queueNotification({
      userIds: uniqueUserIds,
      title: 'New Task Assignment',
      message: `You have been assigned to task: ${taskTitle}`,
      type: 'TASK_ASSIGNMENT',
      entityId: taskId,
      metadata: { taskTitle, creatorId },
    });
  }

  /**
   * Notify client about invoice creation
   */
  async notifyInvoiceCreation(
    clientId: string,
    invoiceId: string,
    invoiceAmount: number,
  ) {
    await this.queueNotification({
      userIds: [clientId],
      title: 'New Invoice Created',
      message: `A new sales invoice has been created for you. Amount: $${invoiceAmount}`,
      type: 'INVOICE_CREATED',
      entityId: invoiceId,
      metadata: { amount: invoiceAmount },
    });
  }

  // Placeholder – implement properly when ready
  create(createNotificationDto: CreateNotificationDto) {
    return `This action adds a new notification and ${JSON.stringify(createNotificationDto)}`;
  }
  // --------------- Get all notifications for a user --------------------------
  @HandleError('Failed to get all notifications')
  async getAllNotifications(userId: string): Promise<TResponse<any>> {
    const userNotifications =
      await this.prisma.client.smNotificationUser.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { smnotification: true },
      });

    const totalCount = userNotifications.length;
    const unreadCount = userNotifications.filter((un) => !un.read).length;

    const formatted = userNotifications.map((un) => ({
      id: un.smnotification.id,
      userNotificationId: un.id,
      type: un.smnotification.type,
      title: un.smnotification.title,
      message: un.smnotification.message,
      meta: un.smnotification.metadata ?? {},
      read: un.read,
      createdAt: un.createdAt,
    }));

    return successResponse(
      {
        total: totalCount,
        unread: unreadCount,
        notifications: formatted,
      },
      'Notifications retrieved successfully',
    );
  }
  // ------- Get unread notifications ------
  @HandleError('Failed to get unread notifications')
  async getUnreadNotifications(userId: string): Promise<TResponse<any>> {
    const userNotifications =
      await this.prisma.client.smNotificationUser.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
      });

    const unreadCount = userNotifications.length;

    const formatted = userNotifications.map((un: any) => ({
      id: un.notification.id,
      userNotificationId: un.id,
      type: un.notification.type,
      title: un.notification.title,
      message: un.notification.message,
      meta: un.notification.meta ?? {},
      read: un.read,
      createdAt: un.createdAt,
    }));

    return successResponse(
      {
        unread: unreadCount,
        totalUnread: unreadCount,
        notifications: formatted,
      },
      unreadCount > 0
        ? 'Unread notifications retrieved'
        : 'No unread notifications',
    );
  }

  // ------- Read single notification setting------
  @HandleError('Failed to mark notification as read')
  async readSingleNotification(
    userId: string,
    notificationId: string,
  ): Promise<TResponse<any>> {
    const userNotif = await this.prisma.client.smNotificationUser.findUnique({
      where: {
        userId_notificationId: { userId, notificationId },
      },
      include: { smnotification: true },
    });

    if (!userNotif) {
      throw new NotFoundException('Notification not found for this user');
    }

    if (userNotif.read) {
      return successResponse(
        { id: notificationId, read: true },
        'Notification was already read',
      );
    }

    const updated = await this.prisma.client.smNotificationUser.update({
      where: { id: userNotif.id },
      data: { read: true },
      include: { smnotification: true },
    });

    // Optional: return current unread count after this action
    const remainingUnread = await this.prisma.client.smNotificationUser.count({
      where: { userId, read: false },
    });

    return successResponse(
      {
        id: notificationId,
        read: true,
        remainingUnread,
      },
      'Notification marked as read',
    );
  }
  // ------------------ Read all notifications ----------------------
  @HandleError('Failed to read all notifications')
  async readAllNotifications(userId: string): Promise<TResponse<any>> {
    const { count } = await this.prisma.client.smNotificationUser.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return successResponse(
      {
        markedAsRead: count,
        remainingUnread: 0,
      },
      count > 0
        ? 'All notifications marked as read'
        : 'No unread notifications to mark',
    );
  }
  // ------------------ Mark all notifications as read ----------------------
  @HandleError('Failed to mark all notifications as read')
  async makeAllNotificationRead(userId: string): Promise<TResponse<any>> {
    const { count } = await this.prisma.client.smNotificationUser.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return successResponse(
      {
        markedAsRead: count,
        remainingUnread: 0,
      },
      count > 0
        ? 'All notifications marked as read'
        : 'No unread notifications to mark',
    );
  }

  // ------------------ Delete single notification ----------------------

  @HandleError('Failed to delete single notification')
  async deleteSingleNotifications(
    userId: string,
    notificationId: string,
  ): Promise<TResponse<any>> {
    const exists = await this.prisma.client.smNotificationUser.findUnique({
      where: {
        userId_notificationId: { userId, notificationId },
      },
    });

    if (!exists) {
      throw new NotFoundException('Notification not found for this user');
    }

    await this.prisma.client.smNotificationUser.delete({
      where: { id: exists.id },
    });

    // Optional: return updated counts
    const [total, unread] = await Promise.all([
      this.prisma.client.smNotificationUser.count({
        where: { userId },
      }),
      this.prisma.client.smNotificationUser.count({
        where: { userId, read: false },
      }),
    ]);

    return successResponse(
      { total, unread },
      'Notification deleted successfully',
    );
  }
  // ------------------ Delete all notifications ----------------------
  @HandleError('Failed to delete all notifications')
  async deleteAllNotification(userId: string): Promise<TResponse<any>> {
    const { count } = await this.prisma.client.smNotificationUser.deleteMany({
      where: { userId },
    });

    return successResponse(
      {
        deleted: count,
        remaining: 0,
      },
      count > 0 ? 'All notifications deleted' : 'No notifications to delete',
    );
  }

  // -------------- Get notification counts --------------------------
  @HandleError('Failed to get notification counts')
  async getNotificationCounts(userId: string) {
    const [total, unread] = await Promise.all([
      this.prisma.client.smNotificationUser.count({ where: { userId } }),
      this.prisma.client.smNotificationUser.count({
        where: { userId, read: false },
      }),
    ]);

    return { total, unread };
  }
}
