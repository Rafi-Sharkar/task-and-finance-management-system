import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { GetUserId } from '@/core/jwt/jwt.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get current user's activity status for today
   */
  @Get('today')
  @ApiBearerAuth()
  async getTodayActivity(@GetUserId() userId: string) {
    return this.activityService.getTodayActivity(userId);
  }

  /**
   * Get activity summary for a date range
   */
  @Get('summary')
  @ApiBearerAuth()
  async getActivitySummary(
    @GetUserId() userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.activityService.getActivitySummary(userId, start, end);
  }

  /**
   * Check if user is currently active
   */
  @Get('is-active')
  @ApiBearerAuth()
  async isUserActive(@GetUserId() userId: string) {
    const isActive = await this.activityService.isUserActive(userId);
    return { isActive };
  }

  /**
   * Check if another user is currently active (for admins or team features)
   */
  @Get('check-user')
  @ApiBearerAuth()
  async checkUserActive(@Query('userId') targetUserId: string) {
    const isActive = await this.activityService.isUserActive(targetUserId);
    return { isActive, userId: targetUserId };
  }

  /**
   * Get activity dashboard data (weekly view with statistics)
   */
  @Get('dashboard')
  @ApiBearerAuth()
  async getActivityDashboard(@GetUserId() userId: string) {
    return this.activityService.getActivityDashboard(userId);
  }

  /**
   * Get detailed daily activity stats for a specific date
   */
  @Get('daily-stats')
  @ApiBearerAuth()
  async getDailyActivityStats(
    @GetUserId() userId: string,
    @Query('date') date: string,
  ) {
    const activityDate = new Date(date);
    return this.activityService.getDailyActivityStats(userId, activityDate);
  }
}
