/* eslint-disable @typescript-eslint/no-unused-vars */
import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { UserEnum } from '@/common/enum/user.enum';
import { S3Service } from '@/lib/file/services/s3.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisService } from '@/lib/redis/redis.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../sm-notification/sm-notification.service';
import { EVENT_TYPES } from '../sm-notification/interface/event.name';
import { UserRegistration } from '../sm-notification/interface/events.payload';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly s3Service: S3Service,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {}

  async register(payload: RegisterDto, createdBy: string) {
    // Check if the user creating the account is ADMIN or SUPER_ADMIN
    const adminUser = await this.prisma.client.user.findUnique({
      where: { id: createdBy },
      select: { role: true },
    });

    if (!adminUser) {
      throw new NotFoundException(
        "We couldn't verify your admin account. Please log in again.",
      );
    }

    if (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        "You don't have permission to register new users. Only administrators can create user accounts.",
      );
    }

    const passwordHash = await this.authUtils.hash(payload.password);

    try {
      const user = await this.prisma.client.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: payload.username,
            email: payload.email,
            passwordHash,
            role: payload.role,
            accountStatus: 'PENDING',
          },
        });

        await tx.setting.create({
          data: { userId: user.id },
        });
        return user;
      });

      // Create audit log for registration
      await this.auditService.createLog({
        userId: user.id,
        action: 'USER_REGISTERED',
      });

      // Emit registration mail event
      this.eventEmitter.emit(QueueEventsEnum.REGISTRATION_MAIL, {
        email: user.email,
        username: user.username,
        password: payload.password,
        role: user.role,
      });

      // Get all admin and super admin users
      const admins = await this.prisma.client.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN'],
          },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true, email: true },
      });

      // Send notification to all admins and super admins
      await this.notificationService.notifyAdmins(
        'New User Registration',
        `A new user "${user.username}" (${user.email}) has been registered with role: ${user.role}`,
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      );

      // Emit registration event
      // Emit registration event (FIXED)
      this.eventEmitter.emit(EVENT_TYPES.USERREGISTRATION_CREATE, {
        action: 'CREATE',
        info: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          createdAt: user.createdAt,
          recipients: admins,
        },
        meta: {
          registrationMethod: 'email',
        },
      } as unknown as UserRegistration);

      // Remove sensitive data before returning
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const target = Array.isArray(err?.meta?.target)
          ? err.meta.target.join(', ')
          : err?.meta?.target || 'unique field';
        throw new BadRequestException(
          `User with provided ${target} already exists`,
        );
      }
      throw err;
    }
  }

  async login(payload: LoginDto) {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new BadRequestException(
          "We couldn't find an account with this email address. Please check your email or register for a new account.",
        );
      }

      const isPasswordValid = await this.authUtils.compare(
        payload.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'The password you entered is incorrect. Please try again or use the forgot password option.',
        );
      }

      if (user.changePasswordRequired === true) {
        return { user: { changePasswordRequired: true } };
      }

      // Generate tokens
      const tokens = await this.authUtils.generateTokenPair({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // Update last login
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Create audit log for login
      await this.auditService.createLog({
        userId: user.id,
        action: 'USER_LOGIN',
      });

      return { user, ...tokens };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    payload: UpdateUserDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException(
          "We couldn't find your account. Please log in again.",
        );
      }

      if (payload.username && payload.username !== existingUser.username) {
        const usernameExists = await this.prisma.client.user.findUnique({
          where: { username: payload.username },
        });
        if (usernameExists) {
          throw new BadRequestException(
            'This username is already taken. Please choose a different username.',
          );
        }
      }

      // Handle avatar upload
      let avatarUrl = existingUser.avatarUrl;
      if (avatar) {
        // Delete old avatar if exists
        if (existingUser.avatarUrl) {
          try {
            await this.s3Service.deleteFile(existingUser.avatarUrl);
          } catch (error) {
            // Log error but don't fail the update
            console.error('Failed to delete old avatar:', error);
          }
        }

        // Upload new avatar
        avatarUrl = await this.s3Service.uploadFile(avatar, 'avatars');
      }

      // Update user
      const updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          fullName: payload.fullName,
          username: payload.username,
          phone: payload.phone,
          role: payload.role,
          accountStatus: payload.accountStatus,
          avatarUrl,
          updatedAt: new Date(),
        },
      });

      // Create audit log for profile update
      await this.auditService.createLog({
        userId: updatedUser.id,
        action: 'PROFILE_UPDATED',
      });

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Find refresh token in database
      const tokenRecord = await this.prisma.client.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: true,
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException(
          'Your session token is invalid. Please log in again to continue.',
        );
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        // Delete expired token
        await this.prisma.client.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new UnauthorizedException(
          'Your session has expired. Please log in again to continue.',
        );
      }

      // Generate new access token
      const accessToken = this.authUtils.generateAccessToken({
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      });

      // Create audit log for token refresh
      await this.auditService.createLog({
        userId: tokenRecord.user.id,
        action: 'TOKEN_REFRESHED',
      });

      return {
        accessToken,
        refreshToken: tokenRecord.token,
        refreshTokenExpiresAt: tokenRecord.expiresAt,
      };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(payload: UpdatePasswordDto) {
    try {
      // Find user by email
      const user = await this.prisma.client.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find an account with this email address. Please check your email.",
        );
      }

      // Verify current password
      const isPasswordValid = await this.authUtils.compare(
        payload.currentPassword,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'Your current password is incorrect. Please try again.',
        );
      }

      // Hash new password
      const newPasswordHash = await this.authUtils.hash(payload.newPassword);

      // Update password and activate account if first time
      const updateData: any = {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      };

      // If user has changePasswordRequired = true, activate the account
      if (user.changePasswordRequired) {
        updateData.isVerified = true;
        updateData.changePasswordRequired = false;
        updateData.accountStatus = 'ACTIVE';
      }

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Create audit log
      await this.auditService.createLog({
        userId: user.id,
        action: user.changePasswordRequired
          ? 'ACCOUNT_ACTIVATED'
          : 'PASSWORD_UPDATED',
      });

      return {
        message: user.changePasswordRequired
          ? 'Great! Your password has been updated and your account is now active. You can now log in with your new password.'
          : 'Your password has been updated successfully. Please use your new password for future logins.',
      };
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    try {
      // Find user by email
      const user = await this.prisma.client.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          message:
            "If an account exists with this email, we've sent a verification code. Please check your inbox.",
        };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 15 minutes expiry
      const redisKey = `otp:reset-password:${user.email}`;
      await this.redisService.set(redisKey, otp, 5 * 60); // 15 minutes in seconds

      // Return OTP data for queue processing
      return {
        email: user.email,
        otp,
        fullName: user.fullName || user.username,
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(payload: ResetPasswordDto) {
    try {
      // Find user by email
      const user = await this.prisma.client.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find an account with this email address. Please check your email and try again.",
        );
      }

      // Get OTP from Redis
      const redisKey = `otp:reset-password:${user.email}`;
      const storedOtp = await this.redisService.get(redisKey);

      // If OTP has expired, generate and send a new one
      if (!storedOtp) {
        // Generate new 6-digit OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store new OTP in Redis with 15 minutes expiry
        await this.redisService.set(redisKey, newOtp, 5 * 60);

        // Emit event to send new OTP via email
        this.eventEmitter.emit(QueueEventsEnum.FORGOT_PASSWORD_OTP, {
          email: user.email,
          otp: newOtp,
          fullName: user.fullName || user.username,
        });

        // Create audit log
        await this.auditService.createLog({
          userId: user.id,
          action: 'OTP_RESENT',
        });

        return {
          message:
            "Your verification code has expired. We've sent a new code to your email. Please check your inbox.",
          otpSent: true,
        };
      }

      // Verify OTP
      if (storedOtp !== payload.otp) {
        throw new BadRequestException(
          'The verification code you entered is incorrect. Please check your email and try again.',
        );
      }

      // Hash new password
      const newPasswordHash = await this.authUtils.hash(payload.newPassword);

      // Update password
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      // Delete OTP from Redis
      await this.redisService.del(redisKey);

      // Create audit log
      await this.auditService.createLog({
        userId: user.id,
        action: 'PASSWORD_RESET',
      });

      return {
        message:
          'Success! Your password has been reset. You can now log in with your new password.',
      };
    } catch (error) {
      throw error;
    }
  }
}
