import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start a new user session
   */
  async startSession(userId: string): Promise<string> {
    try {
      const session = await this.prisma.client.userSession.create({
        data: {
          userId,
          startTime: new Date(),
          lastHeartbeat: new Date(),
        },
      });

      this.logger.log(`Session started for user ${userId}: ${session.id}`);
      return session.id;
    } catch (error) {
      this.logger.error(`Failed to start session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update heartbeat for an active session
   */
  async updateHeartbeat(sessionId: string): Promise<void> {
    try {
      await this.prisma.client.userSession.update({
        where: { id: sessionId },
        data: { lastHeartbeat: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update heartbeat for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * End a user session and calculate total duration
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = await this.prisma.client.userSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found`);
        return;
      }

      const endTime = new Date();
      const durationSec = Math.floor(
        (endTime.getTime() - session.startTime.getTime()) / 1000,
      );

      // Update session with end time and duration
      await this.prisma.client.userSession.update({
        where: { id: sessionId },
        data: {
          endTime,
          durationSec,
        },
      });

      // Update daily activity
      await this.updateDailyActivity(session.userId, durationSec, endTime);

      this.logger.log(
        `Session ended for user ${session.userId}: ${sessionId} (${durationSec}s)`,
      );
    } catch (error) {
      this.logger.error(`Failed to end session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update or create daily activity record
   */
  private async updateDailyActivity(
    userId: string,
    durationSec: number,
    date: Date,
  ): Promise<void> {
    try {
      // Get date at midnight UTC (without time) - always use UTC for consistency
      const activityDate = new Date(date);
      activityDate.setUTCHours(0, 0, 0, 0);

      await this.prisma.client.userDailyActivity.upsert({
        where: {
          userId_date: {
            userId,
            date: activityDate,
          },
        },
        create: {
          userId,
          date: activityDate,
          totalDurationSec: durationSec,
        },
        update: {
          totalDurationSec: {
            increment: durationSec,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update daily activity for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get active sessions for a user (sessions without end time or with recent heartbeat)
   */
  async getActiveSessions(userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.prisma.client.userSession.findMany({
      where: {
        userId,
        endTime: null,
        lastHeartbeat: {
          gte: fiveMinutesAgo,
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  /**
   * Check if user is currently active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const activeSessions = await this.getActiveSessions(userId);
    return activeSessions.length > 0;
  }

  /**
   * Get user's daily activity for a specific date
   */
  async getDailyActivity(userId: string, date: Date) {
    const activityDate = new Date(date);
    activityDate.setUTCHours(0, 0, 0, 0);

    return this.prisma.client.userDailyActivity.findUnique({
      where: {
        userId_date: {
          userId,
          date: activityDate,
        },
      },
    });
  }

  /**
   * Get user's daily activity for today including active session time
   */
  async getTodayActivity(userId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get stored daily activity
    const dailyActivity = await this.prisma.client.userDailyActivity.findUnique(
      {
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      },
    );

    // Get active sessions and calculate current session time
    const activeSessions = await this.getActiveSessions(userId);
    let activeSessionTime = 0;

    for (const session of activeSessions) {
      const now = new Date();
      activeSessionTime += Math.floor(
        (now.getTime() - session.startTime.getTime()) / 1000,
      );
    }

    const totalDurationSec =
      (dailyActivity?.totalDurationSec || 0) + activeSessionTime;

    return {
      isActive: activeSessions.length > 0,
      totalDurationSec,
      activeSessions: activeSessions.length,
      date: today,
    };
  }

  /**
   * Get user activity summary for a date range
   */
  async getActivitySummary(userId: string, startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    return this.prisma.client.userDailyActivity.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Clean up stale sessions (sessions with no heartbeat for > 5 minutes)
   */
  async cleanupStaleSessions(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const staleSessions = await this.prisma.client.userSession.findMany({
        where: {
          endTime: null,
          lastHeartbeat: {
            lt: fiveMinutesAgo,
          },
        },
      });

      for (const session of staleSessions) {
        await this.endSession(session.id);
      }

      if (staleSessions.length > 0) {
        this.logger.log(`Cleaned up ${staleSessions.length} stale sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup stale sessions:', error);
    }
  }

  /**
   * Get activity dashboard data (weekly view with average time spent)
   */
  async getActivityDashboard(userId: string) {
    try {
      // Get the current week (Monday to Sunday) in UTC
      const today = new Date();
      const dayOfWeek = today.getUTCDay();

      // Calculate days to subtract to get to Monday (1 = Monday, 0 = Sunday)
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const weekStart = new Date(today);
      weekStart.setUTCDate(today.getUTCDate() - daysToMonday);
      weekStart.setUTCHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      // Get daily activities for the week
      const weeklyActivities =
        await this.prisma.client.userDailyActivity.findMany({
          where: {
            userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

      // Get all active sessions for today to add to total
      const activeSessions = await this.getActiveSessions(userId);
      let activeSessionTime = 0;
      for (const session of activeSessions) {
        const now = new Date();
        activeSessionTime += Math.floor(
          (now.getTime() - session.startTime.getTime()) / 1000,
        );
      }

      // Calculate totals for today (UTC)
      const today_date = new Date();
      today_date.setUTCHours(0, 0, 0, 0);

      const todayActivity = weeklyActivities.find(
        (a) => a.date.getTime() === today_date.getTime(),
      );

      const todayTotal =
        (todayActivity?.totalDurationSec || 0) + activeSessionTime;

      // Build weekly data (Monday to Sunday)
      const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const weekData = [];
      let totalWeekSeconds = 0;

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setUTCDate(weekStart.getUTCDate() + i);
        dayDate.setUTCHours(0, 0, 0, 0);

        const dayActivity = weeklyActivities.find(
          (a) => a.date.getTime() === dayDate.getTime(),
        );

        const durationSec = dayActivity?.totalDurationSec || 0;
        totalWeekSeconds += durationSec;

        weekData.push({
          day: dayLabels[i],
          date: dayDate,
          durationSec,
          durationFormatted: this.formatDuration(durationSec),
          isToday: dayDate.getTime() === today_date.getTime(),
        });
      }

      // Calculate average (only count days with activity)
      // Calculate average (only count days with activity)
      const daysWithActivity = weekData.filter((d) => d.durationSec > 0).length;
      const avgDurationSec =
        daysWithActivity > 0
          ? Math.floor(totalWeekSeconds / daysWithActivity)
          : 0;

      return {
        averageTimeSpent: this.formatDuration(avgDurationSec),
        averageTimeSpentSec: avgDurationSec,
        weeklyData: weekData,
        todayDurationSec: todayTotal,
        todayDurationFormatted: this.formatDuration(todayTotal),
        totalWeekSeconds,
        weekStart,
        weekEnd,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get activity dashboard for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Format duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get detailed daily activity stats for a specific date
   */
  async getDailyActivityStats(userId: string, date: Date) {
    try {
      const activityDate = new Date(date);
      activityDate.setUTCHours(0, 0, 0, 0);

      const dailyActivity =
        await this.prisma.client.userDailyActivity.findUnique({
          where: {
            userId_date: {
              userId,
              date: activityDate,
            },
          },
        });

      if (!dailyActivity) {
        return {
          date: activityDate,
          totalDurationSec: 0,
          totalDurationFormatted: '0m',
          sessions: [],
        };
      }

      // Get sessions for this day
      const sessions = await this.prisma.client.userSession.findMany({
        where: {
          userId,
          startTime: {
            gte: activityDate,
            lt: new Date(activityDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return {
        date: activityDate,
        totalDurationSec: dailyActivity.totalDurationSec,
        totalDurationFormatted: this.formatDuration(
          dailyActivity.totalDurationSec,
        ),
        sessions: sessions.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          durationSec: s.durationSec,
          durationFormatted: this.formatDuration(s.durationSec),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get daily activity stats for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
