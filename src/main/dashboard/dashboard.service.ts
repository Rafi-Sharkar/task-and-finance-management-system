import { PrismaService } from '@/lib/prisma/prisma.service';
import { ActivityService } from '@/main/activity/activity.service';
import { FinanceDashboardService } from '@/main/finance/finance-dashboard/finance-dashboard.service';
import { TaskService } from '@/main/task/task.service';
import { Injectable, Logger } from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  TaskStatus,
  UserAccountStatus,
} from '@prisma';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly financeDashboardService: FinanceDashboardService,
    private readonly activityService: ActivityService,
  ) {}

  async getAdminDashboard(userId: string) {
    this.logger.log(`Fetching admin dashboard for user ${userId}`);

    // Fetch all data in parallel for better performance
    const [
      topCounts,
      incomeExpenseStats,
      taskActivity,
      recentTasks,
      userStats,
      recentAudits,
      activityTimeStats,
      activityDashboard,
    ] = await Promise.all([
      this.getTopCounts(),
      this.getIncomeExpenseStats(),
      this.getTaskActivity(),
      this.getRecentTasks(),
      this.getUserStats(),
      this.getRecentAudits(),
      this.getAverageTimeSpentByActivity(),
      this.activityService.getActivityDashboard(userId),
    ]);

    return {
      topCounts,
      incomeExpenseStats,
      taskActivity,
      recentTasks,
      userStats,
      recentAudits,
      activityTimeStats,
      activityDashboard,
    };
  }

  private async getTopCounts() {
    const [usersCount, documentsCount, tasksCount, totalRevenue] =
      await Promise.all([
        this.prisma.client.user.count({
          where: { isDeleted: false },
        }),
        this.prisma.client.document.count({
          where: { isDeleted: false },
        }),
        this.prisma.client.task.count({
          where: { isDeleted: false },
        }),
        this.prisma.client.invoice.aggregate({
          _sum: { amount: true },
          where: {
            invoiceType: InvoiceType.SELLS,
            invoiceStatus: { not: InvoiceStatus.PENDING },
          },
        }),
      ]);

    return {
      usersCount,
      documentsCount,
      tasksCount,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }

  private async getIncomeExpenseStats() {
    return this.financeDashboardService.getStatistics();
  }

  private async getTaskActivity() {
    const [completedCount, incompleteCount, inProgressCount, totalCount] =
      await Promise.all([
        this.prisma.client.task.count({
          where: {
            status: TaskStatus.COMPLETED,
            isDeleted: false,
          },
        }),
        this.prisma.client.task.count({
          where: {
            status: TaskStatus.NOT_COMPLETED,
            isDeleted: false,
          },
        }),
        this.prisma.client.task.count({
          where: {
            status: TaskStatus.IN_PROGRESS,
            isDeleted: false,
          },
        }),
        this.prisma.client.task.count({
          where: { isDeleted: false },
        }),
      ]);

    const completePercentage =
      totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const incompletePercentage =
      totalCount > 0 ? (incompleteCount / totalCount) * 100 : 0;
    const inProgressPercentage =
      totalCount > 0 ? (inProgressCount / totalCount) * 100 : 0;

    // Calculate average activity percentage (considering completed tasks as fully active)
    const totalActivityAverage = totalCount > 0 ? completePercentage : 0;

    return {
      completed: {
        count: completedCount,
        percentage: Number(completePercentage.toFixed(2)),
      },
      incomplete: {
        count: incompleteCount,
        percentage: Number(incompletePercentage.toFixed(2)),
      },
      inProgress: {
        count: inProgressCount,
        percentage: Number(inProgressPercentage.toFixed(2)),
      },
      totalTasks: totalCount,
      totalActivityAverage: Number(totalActivityAverage.toFixed(2)),
    };
  }

  private async getUserStats() {
    const [pendingUsers, activeUsers, inactiveUsers, totalUsers] =
      await Promise.all([
        this.prisma.client.user.count({
          where: {
            accountStatus: UserAccountStatus.PENDING,
            isDeleted: false,
          },
        }),
        this.prisma.client.user.count({
          where: {
            accountStatus: UserAccountStatus.ACTIVE,
            isDeleted: false,
          },
        }),
        this.prisma.client.user.count({
          where: {
            accountStatus: UserAccountStatus.INACTIVE,
            isDeleted: false,
          },
        }),
        this.prisma.client.user.count({
          where: { isDeleted: false },
        }),
      ]);

    return {
      pending: pendingUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      total: totalUsers,
    };
  }

  private async getRecentAudits() {
    const audits = await this.prisma.client.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return audits;
  }

  private async getRecentTasks() {
    const tasks = await this.prisma.client.task.findMany({
      where: {
        isDeleted: false,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return tasks;
  }

  private async getAverageTimeSpentByActivity() {
    // Get activity data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activities = await this.prisma.client.userDailyActivity.findMany({
      where: {
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Group by day and calculate average hours
    const activityByDay = activities.reduce(
      (acc, activity) => {
        const dateKey = activity.date.toISOString().split('T')[0];
        const dayName = new Date(activity.date).toLocaleDateString('en-US', {
          weekday: 'short',
        });

        if (!acc[dateKey]) {
          acc[dateKey] = {
            day: dayName,
            date: dateKey,
            totalSeconds: 0,
            count: 0,
          };
        }

        acc[dateKey].totalSeconds += activity.totalDurationSec;
        acc[dateKey].count += 1;

        return acc;
      },
      {} as Record<
        string,
        { day: string; date: string; totalSeconds: number; count: number }
      >,
    );

    // Convert to array and calculate average hours
    const result = Object.values(activityByDay).map((item) => {
      const averageSeconds =
        item.count > 0 ? item.totalSeconds / item.count : 0;
      const averageHours = averageSeconds / 3600;

      return {
        day: item.day,
        date: item.date,
        averageHours: Number(averageHours.toFixed(2)),
        totalHours: Number((item.totalSeconds / 3600).toFixed(2)),
      };
    });

    return result;
  }

  async getManagerDashboard(userId: string) {
    this.logger.log(`Fetching manager dashboard for user ${userId}`);

    // Fetch all data in parallel for better performance
    const [
      topCounts,
      taskActivity,
      userStats,
      myRecentTasks,
      myRecentAudits,
      myActivityTimeStats,
      activityDashboard,
    ] = await Promise.all([
      this.getManagerTopCounts(userId),
      this.getTaskActivity(),
      this.getUserStats(),
      this.taskService.getMyRecentTask(userId),
      this.getMyRecentAudits(userId),
      this.getMyAverageTimeSpent(userId),
      this.activityService.getActivityDashboard(userId),
    ]);

    return {
      topCounts,
      taskActivity,
      userStats,
      myRecentTasks,
      myRecentAudits,
      myActivityTimeStats,
      activityDashboard,
    };
  }

  private async getManagerTopCounts(userId: string) {
    const [usersCount, filesCount, myTasksCount, teamTasksCount] =
      await Promise.all([
        this.prisma.client.user.count({
          where: { isDeleted: false },
        }),
        this.prisma.client.file.count(),
        this.prisma.client.taskAssignment.count({
          where: {
            employeeId: userId,
          },
        }),
        this.prisma.client.task.count({
          where: { isDeleted: false },
        }),
      ]);

    return {
      usersCount,
      filesCount,
      myTasksCount,
      teamTasksCount,
    };
  }

  private async getMyRecentAudits(userId: string) {
    const audits = await this.prisma.client.auditLog.findMany({
      where: {
        userId: userId,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return audits;
  }

  private async getMyAverageTimeSpent(userId: string) {
    // Get activity data for the last 7 days for the specific user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activities = await this.prisma.client.userDailyActivity.findMany({
      where: {
        userId: userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Group by day and calculate hours
    const activityByDay = activities.reduce(
      (acc, activity) => {
        const dateKey = activity.date.toISOString().split('T')[0];
        const dayName = new Date(activity.date).toLocaleDateString('en-US', {
          weekday: 'short',
        });

        if (!acc[dateKey]) {
          acc[dateKey] = {
            day: dayName,
            date: dateKey,
            totalSeconds: activity.totalDurationSec,
          };
        } else {
          acc[dateKey].totalSeconds += activity.totalDurationSec;
        }

        return acc;
      },
      {} as Record<string, { day: string; date: string; totalSeconds: number }>,
    );

    // Convert to array and calculate hours
    const result = Object.values(activityByDay).map((item) => {
      const hours = item.totalSeconds / 3600;

      return {
        day: item.day,
        date: item.date,
        hours: Number(hours.toFixed(2)),
      };
    });

    return result;
  }

  async getUserDashboard(userId: string) {
    this.logger.log(`Fetching user dashboard for user ${userId}`);

    // Fetch all data in parallel for better performance
    const [
      myTaskActivity,
      myRecentTasks,
      myActivityTimeStats,
      activityDashboard,
    ] = await Promise.all([
      this.getMyTaskActivity(userId),
      this.taskService.getMyRecentTask(userId),
      this.getMyAverageTimeSpent(userId),
      this.activityService.getActivityDashboard(userId),
    ]);

    return {
      myTaskActivity,
      myRecentTasks,
      myActivityTimeStats,
      activityDashboard,
    };
  }

  private async getMyTaskActivity(userId: string) {
    // Get all task assignments for the user
    const assignments = await this.prisma.client.taskAssignment.findMany({
      where: {
        employeeId: userId,
      },
      include: {
        task: {
          select: {
            status: true,
          },
        },
      },
    });

    const totalCount = assignments.length;
    const completedCount = assignments.filter(
      (a) => a.task.status === TaskStatus.COMPLETED,
    ).length;
    const incompleteCount = assignments.filter(
      (a) => a.task.status === TaskStatus.NOT_COMPLETED,
    ).length;
    const inProgressCount = assignments.filter(
      (a) => a.task.status === TaskStatus.IN_PROGRESS,
    ).length;

    const completePercentage =
      totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const incompletePercentage =
      totalCount > 0 ? (incompleteCount / totalCount) * 100 : 0;
    const inProgressPercentage =
      totalCount > 0 ? (inProgressCount / totalCount) * 100 : 0;

    // Calculate average activity percentage (considering completed tasks as fully active)
    const totalActivityAverage = totalCount > 0 ? completePercentage : 0;

    return {
      completed: {
        count: completedCount,
        percentage: Number(completePercentage.toFixed(2)),
      },
      incomplete: {
        count: incompleteCount,
        percentage: Number(incompletePercentage.toFixed(2)),
      },
      inProgress: {
        count: inProgressCount,
        percentage: Number(inProgressPercentage.toFixed(2)),
      },
      totalTasks: totalCount,
      totalActivityAverage: Number(totalActivityAverage.toFixed(2)),
    };
  }

  async getClientDashboard(userId: string) {
    this.logger.log(`Fetching client dashboard for user ${userId}`);

    // Fetch all client data in parallel
    const [
      recentNotifications,
      recentInvoices,
      recentDocuments,
      notificationSummary,
      invoiceSummary,
      documentSummary,
    ] = await Promise.all([
      this.getClientRecentNotifications(userId),
      this.getClientRecentInvoices(userId),
      this.getClientRecentDocuments(userId),
      this.getClientNotificationSummary(userId),
      this.getClientInvoiceSummary(userId),
      this.getClientDocumentSummary(userId),
    ]);

    return {
      recentNotifications,
      recentInvoices,
      recentDocuments,
      summary: {
        ...notificationSummary,
        ...invoiceSummary,
        ...documentSummary,
      },
    };
  }

  private async getClientRecentNotifications(userId: string, limit = 10) {
    const notifications = await this.prisma.client.userNotification.findMany({
      where: {
        userId,
      },
      include: {
        notification: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return notifications.map((un) => ({
      notificationId: un.notification.id,
      type: un.notification.type,
      title: un.notification.title,
      message: un.notification.message,
      isRead: un.read,
      createdAt: un.notification.createdAt,
      meta: un.notification.meta,
    }));
  }

  private async getClientRecentInvoices(userId: string, limit = 10) {
    const invoices = await this.prisma.client.invoice.findMany({
      where: {
        clientId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        invoiceType: true,
        orgName: true,
        supplierName: true,
        description: true,
        amount: true,
        discount: true,
        vat: true,
        vatAmount: true,
        invoiceDate: true,
        invoiceStatus: true,
        discountDeadline: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return invoices;
  }

  private async getClientRecentDocuments(userId: string, limit = 10) {
    // Get documents directly shared to client or through DocumentClient
    const [directDocuments, sharedDocuments] = await Promise.all([
      // Documents directly shared to client
      this.prisma.client.document.findMany({
        where: {
          clientId: userId,
          shareToClient: true,
          isDeleted: false,
        },
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          files: {
            select: {
              id: true,
              url: true,
              mimeType: true,
              sizeKB: true,
              extension: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      // Documents shared through DocumentClient table
      this.prisma.client.documentClient.findMany({
        where: {
          clientId: userId,
          isRemoved: false,
        },
        include: {
          document: {
            include: {
              uploader: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
              files: {
                select: {
                  id: true,
                  url: true,
                  mimeType: true,
                  sizeKB: true,
                  extension: true,
                },
              },
            },
          },
        },
        orderBy: {
          addedAt: 'desc',
        },
        take: limit,
      }),
    ]);

    // Combine and deduplicate documents
    const documentMap = new Map();

    // Add direct documents
    directDocuments.forEach((doc) => {
      documentMap.set(doc.id, {
        id: doc.id,
        name: doc.name,
        documentCateory: doc.documentCateory,
        statusByClient: doc.statusByClient,
        shareToClient: doc.shareToClient,
        isSigned: doc.isSigned,
        createdAt: doc.createdAt,
        uploader: doc.uploader,
        project: doc.project,
        files: doc.files,
      });
    });

    // Add shared documents (avoid duplicates)
    sharedDocuments.forEach((dc) => {
      if (!documentMap.has(dc.document.id)) {
        documentMap.set(dc.document.id, {
          id: dc.document.id,
          name: dc.document.name,
          documentCateory: dc.document.documentCateory,
          statusByClient: dc.document.statusByClient,
          shareToClient: dc.document.shareToClient,
          isSigned: dc.document.isSigned,
          createdAt: dc.document.createdAt,
          uploader: dc.document.uploader,
          project: dc.document.project,
          files: dc.document.files,
        });
      }
    });

    // Convert map to array and sort by creation date
    return Array.from(documentMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  private async getClientNotificationSummary(userId: string) {
    const [totalNotifications, unreadNotifications] = await Promise.all([
      this.prisma.client.userNotification.count({
        where: {
          userId,
        },
      }),
      this.prisma.client.userNotification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      totalNotifications,
      unreadNotifications,
    };
  }

  private async getClientInvoiceSummary(userId: string) {
    const [totalInvoices, dueInvoices, paidInvoices] = await Promise.all([
      this.prisma.client.invoice.count({
        where: {
          clientId: userId,
        },
      }),
      this.prisma.client.invoice.count({
        where: {
          clientId: userId,
          invoiceStatus: InvoiceStatus.DUE,
        },
      }),
      this.prisma.client.invoice.count({
        where: {
          clientId: userId,
          invoiceStatus: InvoiceStatus.PAID,
        },
      }),
    ]);

    return {
      totalInvoices,
      dueInvoices,
      paidInvoices,
    };
  }

  private async getClientDocumentSummary(userId: string) {
    // Get total documents from both sources
    const [directDocuments, sharedDocuments] = await Promise.all([
      this.prisma.client.document.count({
        where: {
          clientId: userId,
          shareToClient: true,
          isDeleted: false,
        },
      }),
      this.prisma.client.documentClient.count({
        where: {
          clientId: userId,
          isRemoved: false,
        },
      }),
    ]);

    // Get pending documents count
    const [directPending, sharedPending] = await Promise.all([
      this.prisma.client.document.count({
        where: {
          clientId: userId,
          shareToClient: true,
          isDeleted: false,
          statusByClient: 'PENDING',
        },
      }),
      this.prisma.client.documentClient.count({
        where: {
          clientId: userId,
          isRemoved: false,
          document: {
            statusByClient: 'PENDING',
          },
        },
      }),
    ]);

    return {
      totalDocuments: directDocuments + sharedDocuments,
      pendingDocuments: directPending + sharedPending,
    };
  }
}
