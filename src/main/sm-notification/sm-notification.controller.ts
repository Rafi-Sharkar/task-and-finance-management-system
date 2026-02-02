import { GetUser, ValidateUser } from '@/core/jwt/jwt.decorator';
import {
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './sm-notification.service';
import { SendCustomNotificationDto } from './dto/send-custom-notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // -------Send custom notification to specific user------
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Send custom notification to a specific user' })
  @Post('send-custom')
  async sendCustomNotification(
    @Body() dto: SendCustomNotificationDto,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.notificationService.sendCustomNotification(
      dto.userId,
      dto.title,
      dto.message,
    );
  }

  // -------get all notification their own notification------
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Get all notifications for the logged-in user' })
  @Get('all-notifications')
  async getAllNotifications(@GetUser('sub') userId: string) {
    return this.notificationService.getAllNotifications(userId);
  }
  // ----------delete all notification setting------------
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({
    summary: 'Delete all notification settings for the logged-in user',
  })
  @Delete('delete-notification')
  async deleteAllNotification(@GetUser('sub') userId: string) {
    return this.notificationService.deleteAllNotification(userId);
  }
  // delete single notification by user id
  @ApiOperation({ summary: 'Delete single notification by notification ID' })
  @ApiBearerAuth()
  @ValidateUser()
  @Delete('delete-single-notifications')
  async deleteSingleNotifications(
    @GetUser('sub') userId: string,
    @Query('notificationId') notificationId: string,
  ) {
    return this.notificationService.deleteSingleNotifications(
      userId,
      notificationId,
    );
  }

  //  -------read all notification setting------
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Read all notifications for the logged-in user' })
  @Get('read-all-notifications')
  async readAllNotifications(@GetUser('sub') userId: string) {
    return this.notificationService.readAllNotifications(userId);
  }

  // -------get unread notification setting------

  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Get unread notifications for the logged-in user' })
  @Get('unread-notifications')
  async getUnreadNotifications(@GetUser('sub') userId: string) {
    return this.notificationService.getUnreadNotifications(userId);
  }

  // -------read single notification setting------
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Mark single notification as read' })
  @Get('read-single-notification')
  async readSingleNotification(
    @GetUser('sub') userId: string,
    @Query('notificationId') notificationId: string,
  ) {
    return this.notificationService.readSingleNotification(
      userId,
      notificationId,
    );
  }

  // -------------- makeAllNotificationRead-----
  @ApiBearerAuth()
  @ValidateUser()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('make-all-notification-read')
  async makeAllNotificationRead(@GetUser('sub') userId: string) {
    return this.notificationService.makeAllNotificationRead(userId);
  }
}
