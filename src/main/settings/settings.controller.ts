import { GetUserId, ValidateEmployee } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Verify2FAOtpDto } from './dto/verify-2fa-otp.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user settings',
    description: 'Retrieve your account settings and preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Your settings have been retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find your settings. Please contact support if this issue persists.",
  })
  @ApiResponse({
    status: 401,
    description:
      'You are not authorized to access this resource. Please log in.',
  })
  async getSettings(@GetUserId() userId: string) {
    const settings = await this.settingsService.getSettings(userId);
    return {
      success: true,
      message: 'Your settings have been retrieved successfully',
      data: settings,
    };
  }

  @Patch()
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user settings',
    description: 'Update your account settings and preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Your settings have been updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid settings data provided. Please check your input and try again.',
  })
  @ApiResponse({
    status: 401,
    description:
      'You are not authorized to perform this action. Please log in.',
  })
  async updateSettings(
    @GetUserId() userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(userId, dto);
    return {
      success: true,
      message: 'Your settings have been updated successfully',
      data: settings,
    };
  }

  @Post('2fa/send-otp')
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send OTP for enabling Two-Factor Authentication',
    description:
      'Request a verification code to enable two-factor authentication. A 6-digit code will be sent to your phone number via SMS. Your phone number must be verified first.',
  })
  @ApiResponse({
    status: 200,
    description:
      'A verification code has been sent to your mobile number. Please check your messages.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Phone number is not set. Please update your phone number first.',
  })
  @ApiResponse({
    status: 401,
    description:
      'You are not authorized to perform this action. Please log in.',
  })
  async sendOTPFor2FA(@GetUserId() userId: string) {
    return this.settingsService.sendOTPFor2FA(userId);
  }

  @Post('2fa/verify-otp')
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify OTP and enable Two-Factor Authentication',
    description:
      'Verify the code sent to your mobile number and activate two-factor authentication for enhanced security.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Great! Two-factor authentication has been enabled for your account. Your account is now more secure.',
  })
  @ApiResponse({
    status: 400,
    description:
      'The verification code you entered is incorrect or has expired. Please try again.',
  })
  @ApiResponse({
    status: 401,
    description:
      'You are not authorized to perform this action. Please log in.',
  })
  async verifyOTPAndEnable2FA(
    @GetUserId() userId: string,
    @Body() dto: Verify2FAOtpDto,
  ) {
    return this.settingsService.verifyOTPAndEnable2FA(userId, dto.otp);
  }

  @Post('2fa/disable')
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable Two-Factor Authentication',
    description:
      'Turn off two-factor authentication for your account. Note: This will reduce your account security.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Two-factor authentication has been disabled for your account.',
  })
  @ApiResponse({
    status: 401,
    description:
      'You are not authorized to perform this action. Please log in.',
  })
  async disable2FA(@GetUserId() userId: string) {
    return this.settingsService.disable2FA(userId);
  }
}
