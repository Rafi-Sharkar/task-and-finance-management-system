import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisService } from '@/lib/redis/redis.service';
import { TwilioService } from '@/lib/twilio/twilio.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly OTP_EXPIRY = 300; // 5 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioService: TwilioService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSettings(userId: string) {
    try {
      const settings = await this.prisma.client.setting.findUnique({
        where: { userId },
      });

      if (!settings) {
        throw new NotFoundException(
          "We couldn't find your settings. Please contact support if this issue persists.",
        );
      }

      return settings;
    } catch (error) {
      throw error;
    }
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    try {
      const settings = await this.prisma.client.setting.update({
        where: { userId },
        data: {
          ...dto,
          updatedAt: new Date(),
        },
      });

      // Create audit log for settings update
      await this.auditService.createLog({
        userId,
        action: 'SETTINGS_UPDATED',
      });

      return settings;
    } catch (error) {
      throw error;
    }
  }

  async sendOTPFor2FA(userId: string) {
    try {
      // Verify user exists and get phone number
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, fullName: true, username: true },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find your account. Please log in again.",
        );
      }

      // Check if phone number exists
      if (!user.phone) {
        throw new BadRequestException(
          'Please update your phone number first before enabling two-factor authentication. Two-factor authentication requires a valid phone number to receive verification codes.',
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with expiry
      const redisKey = `2fa_otp:${userId}`;
      await this.redisService.set(redisKey, otp, this.OTP_EXPIRY);

      // Emit event to trigger OTP sending via BullMQ
      const payload = {
        userId,
        phone: user.phone,
        otp,
        fullName: user.fullName || user.username,
      };

      this.logger.log(`Emitting TWO_FACTOR_OTP event for user ${userId}`);
      await this.eventEmitter.emitAsync(
        QueueEventsEnum.TWO_FACTOR_OTP,
        payload,
      );

      return {
        success: true,
        message:
          'A verification code has been sent to your phone number. Please check your messages.',
        expiresIn: this.OTP_EXPIRY,
      };
    } catch (error) {
      this.logger.error(`Failed to send 2FA OTP for user ${userId}:`, error);
      throw error;
    }
  }

  async verifyOTPAndEnable2FA(userId: string, otp: string) {
    try {
      const redisKey = `2fa_otp:${userId}`;
      const storedOtp = await this.redisService.get(redisKey);

      if (!storedOtp) {
        throw new BadRequestException(
          'Your verification code has expired. Please request a new code and try again.',
        );
      }

      if (storedOtp !== otp) {
        throw new BadRequestException(
          'The verification code you entered is incorrect. Please check and try again.',
        );
      }

      // Delete OTP from Redis
      await this.redisService.del(redisKey);

      // Enable 2FA in settings
      const settings = await this.prisma.client.setting.update({
        where: { userId },
        data: {
          twoFactor: true,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message:
          'Great! Two-factor authentication has been enabled for your account. Your account is now more secure.',
        settings,
      };
    } catch (error) {
      throw error;
    }
  }

  async disable2FA(userId: string) {
    try {
      const settings = await this.prisma.client.setting.update({
        where: { userId },
        data: {
          twoFactor: false,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message:
          'Two-factor authentication has been disabled for your account.',
        settings,
      };
    } catch (error) {
      throw error;
    }
  }
}
