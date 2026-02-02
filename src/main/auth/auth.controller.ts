import { UserResponseDto } from '@/common/dto/user-response.dto';
import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { ApiResponseTypeChecker } from '@/common/swagger/response-typechecker.decorator';
import { successResponse } from '@/common/utils/response.util';
import { GetUserId, ValidateAdmin } from '@/core/jwt/jwt.decorator';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { RequestWithUser } from '@/core/jwt/jwt.interface';
import {
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('register')
  @ValidateAdmin()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register user',
    description:
      'Create a new user account. Only ADMIN and SUPER_ADMIN can register users.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 201,
    successMessage: 'User registered successfully',
    successExampleData: {
      id: 'a5a1f2f0-1234-4b5c-9a8e-abcdef012345',
      fullName: 'johndoe',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '+1704000000001',
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    errors: [
      {
        status: 400,
        message:
          'An account with this email or username already exists. Please use different credentials.',
      },
      {
        status: 403,
        message:
          "You don't have permission to register new users. Only administrators can create user accounts.",
      },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async register(@GetUserId() createdBy: string, @Body() dto: RegisterDto) {
    const user = await this.authService.register(dto, createdBy);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'New user account has been created successfully. Login credentials have been sent to their email.',
    );
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponseTypeChecker({
    model: LoginResponseDto,
    successStatus: 200,
    successMessage: 'Login successful',
    successExampleData: {
      accessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNWExZjJmMC0xMjM0LTRiNWMtOWE4ZS1hYmNkZWYwMTpIzNDUiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3MDQ2MTkyMDEsImV4cCI6MTcxMjM5NTIwMX0.example',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNWExZjJmMC0xMjM0LTRiNWMtOWE4ZS1hYmNkZWYwMTIzNDUiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3MDQ2MTkyMDEsImV4cCI6MTcxMjM5NTIwMX0.example',
    },
    errors: [
      {
        status: 400,
        message:
          "We couldn't find an account with this email address. Please check your email or register for a new account.",
      },
      {
        status: 401,
        message:
          'The password you entered is incorrect. Please try again or use the forgot password option.',
      },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);

    if (result.user.changePasswordRequired === true) {
      return successResponse(
        result,
        'Please update your password to continue. For security reasons, you need to change your password on first login.',
      );
    }
    return successResponse(
      result,
      'Welcome back! You have logged in successfully.',
    );
  }

  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate a new access token using a valid refresh token. The refresh token must not be expired.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponseTypeChecker({
    model: LoginResponseDto,
    successStatus: 200,
    successMessage: 'Token refreshed successfully',
    successExampleData: {
      accessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNWExZjJmMC0xMjM0LTRiNWMtOWE4ZS1hYmNkZWYwMTIzNDUiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3MDQ2MTkyMDEsImV4cCI6MTcxMjM5NTIwMX0.example',
      refreshToken:
        'd0365de54660887f24c655a9743ba72a34f6e0a29a1c16327a5ba5ab62e8bd15',
      refreshTokenExpiresAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    errors: [
      {
        status: 401,
        message:
          'Your session token is invalid. Please log in again to continue.',
      },
      {
        status: 401,
        message: 'Your session has expired. Please log in again to continue.',
      },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken);
    return successResponse(
      result,
      'Your session has been refreshed successfully.',
    );
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user profile information including avatar upload. User must be authenticated.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'Profile updated successfully',
    successExampleData: {
      id: 'a5a1f2f0-1234-4b5c-9a8e-abcdef012345',
      fullName: 'John Doe Updated',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '+1704000000001',
      avatarUrl:
        'https://bucket-name.s3.us-east-1.amazonaws.com/avatars/uuid.jpg',
      role: 'EMPLOYEE',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true,
      isDeleted: false,
      lastLogin: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    errors: [
      {
        status: 401,
        message:
          'You are not authorized to perform this action. Please log in.',
      },
      {
        status: 400,
        message:
          'This username or email is already taken. Please choose different credentials.',
      },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    if (!req.user?.sub) {
      throw new Error('User not authenticated');
    }
    const userId = req.user.sub;
    const updatedUser = await this.authService.updateProfile(
      userId,
      dto,
      avatar,
    );

    const data = plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your profile has been updated successfully.');
  }

  @Post('update-password')
  @ApiOperation({
    summary: 'Update password',
    description:
      'Change your account password. You must provide your current password for verification.',
  })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Your password has been updated successfully. Please use your new password for future logins.',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find an account with this email address. Please check your email.",
  })
  @ApiResponse({
    status: 401,
    description: 'Your current password is incorrect. Please try again.',
  })
  @ApiResponse({
    status: 500,
    description: 'Something went wrong on our end. Please try again later.',
  })
  async updatePassword(@Body() dto: UpdatePasswordDto) {
    const result = await this.authService.updatePassword(dto);
    return successResponse(null, result.message);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description:
      "Request a password reset. We'll send a verification code to your email if an account exists.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      "If an account exists with this email, we've sent a verification code. Please check your inbox.",
  })
  @ApiResponse({
    status: 500,
    description: 'Something went wrong on our end. Please try again later.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto);

    // Emit event to send OTP email via BullMQ
    if (result.email && result.otp) {
      await this.eventEmitter.emitAsync(QueueEventsEnum.FORGOT_PASSWORD_OTP, {
        email: result.email,
        otp: result.otp,
        fullName: result.fullName,
      });
    }

    return successResponse(
      null,
      "If an account exists with this email, we've sent a verification code. Please check your inbox and spam folder.",
    );
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Reset your password using the verification code sent to your email. Enter the code and your new password.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Success! Your password has been reset. You can now log in with your new password.',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find an account with this email address. Please check your email and try again.",
  })
  @ApiResponse({
    status: 400,
    description:
      'The verification code you entered is incorrect. Please check your email and try again.',
  })
  @ApiResponse({
    status: 500,
    description: 'Something went wrong on our end. Please try again later.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);
    return successResponse(null, result.message);
  }
}
