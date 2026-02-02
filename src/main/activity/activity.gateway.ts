import { BaseGateway } from '@/core/socket/base.gateway';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ActivityService } from './activity.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  namespace: '/activity',
})
@Injectable()
export class ActivityGateway extends BaseGateway implements OnModuleDestroy {
  private readonly sessionMap = new Map<string, string>(); // socketId -> sessionId
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly prisma: PrismaService,
    protected readonly jwtService: JwtService,
    private readonly activityService: ActivityService,
  ) {
    super(configService, prisma, jwtService, '/activity');
  }

  afterInit() {
    super.afterInit();

    // Cleanup stale sessions every 5 minutes
    this.heartbeatInterval = setInterval(
      () => {
        this.activityService.cleanupStaleSessions();
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  /**
   * Cleanup interval on module destroy to prevent memory leaks
   */
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.logger.log('Heartbeat interval cleared');
    }
  }

  async handleConnection(client: Socket) {
    await super.handleConnection(client);

    const userId = client.data?.userId;
    if (!userId) return;

    try {
      // Start a new session for this connection
      const sessionId = await this.activityService.startSession(userId);
      this.sessionMap.set(client.id, sessionId);

      // Send current activity status
      const todayActivity = await this.activityService.getTodayActivity(userId);
      client.emit('activity:status', todayActivity);

      this.logger.log(`Activity session started for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to start activity session: ${error.message}`);
    }
  }

  async handleDisconnect(client: Socket) {
    const sessionId = this.sessionMap.get(client.id);

    if (sessionId) {
      try {
        await this.activityService.endSession(sessionId);
        this.sessionMap.delete(client.id);

        const userId = client.data?.userId;
        if (userId) {
          // Send updated activity status
          const todayActivity =
            await this.activityService.getTodayActivity(userId);
          this.server.to(userId).emit('activity:status', todayActivity);
        }
      } catch (error) {
        this.logger.error(`Failed to end activity session: ${error.message}`);
      }
    }

    super.handleDisconnect(client);
  }

  /**
   * Heartbeat to keep session alive
   */
  @SubscribeMessage('activity:heartbeat')
  async handleHeartbeat(client: Socket) {
    const sessionId = this.sessionMap.get(client.id);

    if (!sessionId) {
      return { success: false, message: 'No active session' };
    }

    try {
      await this.activityService.updateHeartbeat(sessionId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Heartbeat failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current activity status
   */
  @SubscribeMessage('activity:getStatus')
  async handleGetStatus(client: Socket) {
    const userId = client.data?.userId;

    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const todayActivity = await this.activityService.getTodayActivity(userId);
      return { success: true, data: todayActivity };
    } catch (error) {
      this.logger.error(`Failed to get activity status: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get activity summary for a date range
   */
  @SubscribeMessage('activity:getSummary')
  async handleGetSummary(
    client: Socket,
    payload: { startDate: string; endDate: string },
  ) {
    const userId = client.data?.userId;

    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const startDate = new Date(payload.startDate);
      const endDate = new Date(payload.endDate);

      const summary = await this.activityService.getActivitySummary(
        userId,
        startDate,
        endDate,
      );

      return { success: true, data: summary };
    } catch (error) {
      this.logger.error(`Failed to get activity summary: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check if a user is currently active
   */
  @SubscribeMessage('activity:checkUserActive')
  async handleCheckUserActive(client: Socket, payload: { userId: string }) {
    try {
      const isActive = await this.activityService.isUserActive(payload.userId);
      return { success: true, data: { isActive } };
    } catch (error) {
      this.logger.error(`Failed to check user active: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get activity dashboard data (weekly view with statistics)
   */
  @SubscribeMessage('activity:getDashboard')
  async handleGetDashboard(client: Socket) {
    const userId = client.data?.userId;

    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const dashboardData =
        await this.activityService.getActivityDashboard(userId);
      return { success: true, data: dashboardData };
    } catch (error) {
      this.logger.error(`Failed to get activity dashboard: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get detailed daily activity stats for a specific date
   */
  @SubscribeMessage('activity:getDailyStats')
  async handleGetDailyStats(client: Socket, payload: { date: string }) {
    const userId = client.data?.userId;

    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const dailyStats = await this.activityService.getDailyActivityStats(
        userId,
        new Date(payload.date),
      );
      return { success: true, data: dailyStats };
    } catch (error) {
      this.logger.error(`Failed to get daily activity stats: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
