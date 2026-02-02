import { ApiResponseTypeChecker } from '@/common/swagger/response-typechecker.decorator';
import { successResponse } from '@/common/utils/response.util';
import {
  GetUser,
  GetUserId,
  ValidateAdmin,
  ValidateAuth,
  ValidateEmployee,
} from '@/core/jwt/jwt.decorator';
import { JWTPayload } from '@/core/jwt/jwt.interface';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { FilterUserDto } from './dto/filter-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get the authenticated user profile information',
  })
  async getMe(@GetUserId() userId: string) {
    const user = await this.userService.getUserById(userId);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'Your profile has been retrieved successfully',
    );
  }

  @Get()
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users with filters',
    description:
      'Retrieve a list of all users. You can filter by account status, activity, verification, and more. Search by name, username, or email.',
  })
  @ApiQuery({
    name: 'accountStatus',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED', 'RESTRICTED'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'createdDate', required: false, type: String })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'User list has been retrieved successfully',
  })
  async getAllUsers(
    @Query() filters: FilterUserDto,
    @GetUserId() userId: string,
    @GetUser() user: JWTPayload,
  ) {
    const result = await this.userService.getAllUsers(
      filters,
      userId,
      user.role,
    );
    const data = plainToInstance(UserResponseDto, result.data, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      { data, meta: result.meta },
      'User list has been retrieved successfully',
    );
  }

  @Get('employees')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all employees',
    description:
      'Retrieve a list of all employees in the system. Only Admin, Manager, and Super Admin can access this.',
  })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'Employee list has been retrieved successfully',
    successExampleData: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'John Doe',
        username: 'john.doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        avatarUrl: 'https://example.com/avatars/john.jpg',
        role: 'EMPLOYEE',
        accountStatus: 'ACTIVE',
        isActive: true,
        isVerified: true,
        lastActive: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        fullName: 'Jane Smith',
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        avatarUrl: 'https://example.com/avatars/jane.jpg',
      },
    ],
    errors: [
      {
        status: 401,
        message: 'You are not authorized to access this resource',
      },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async getAllEmployees() {
    const employees = await this.userService.getAllEmployees();
    const data = plainToInstance(UserResponseDto, employees, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'Employee list has been retrieved successfully',
    );
  }

  @Get(':userId')
  @ValidateAdmin()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve detailed information about a specific user by their unique ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User details have been retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find the user you're looking for. Please check the user ID.",
  })
  async getUserById(@Param('userId') userId: string) {
    const user = await this.userService.getUserById(userId);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'User details have been retrieved successfully',
    );
  }

  @Patch(':userId')
  @ValidateAdmin()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user',
    description:
      'Update user profile information including name, contact details, role, and account status.',
  })
  @ApiBody({ type: AdminUpdateUserDto })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'User profile has been updated successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fullName: 'John Doe Updated',
      username: 'johndoe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'EMPLOYEE',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true,
      isDeleted: false,
      lastActive: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    errors: [
      {
        status: 400,
        message:
          'This email address is already in use. Please choose a different email.',
      },
      {
        status: 404,
        message: "We couldn't find the user you're trying to update.",
      },
      { status: 401, message: 'You are not authorized to perform this action' },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    const user = await this.userService.updateUser(userId, dto);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'User profile has been updated successfully');
  }

  // @Post(':userId/block')
  // @ValidateAdmin()
  // @ApiBearerAuth()
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary: 'Block user',
  //   description: 'Block a user account.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'User blocked successfully',
  // })
  // @ApiResponse({ status: 404, description: 'User not found' })
  // async blockUser(@Param('userId') userId: string) {
  //   const user = await this.userService.blockUser(userId);
  //   const data = plainToInstance(UserResponseDto, user, {
  //     excludeExtraneousValues: true,
  //   });

  //   return successResponse(data, 'User blocked successfully');
  // }

  // @Post(':userId/unblock')
  // @ValidateAdmin()
  // @ApiBearerAuth()
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary: 'Unblock user',
  //   description: 'Unblock a user account.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'User unblocked successfully',
  // })
  // @ApiResponse({ status: 404, description: 'User not found' })
  // async unblockUser(@Param('userId') userId: string) {
  //   const user = await this.userService.unblockUser(userId);
  //   const data = plainToInstance(UserResponseDto, user, {
  //     excludeExtraneousValues: true,
  //   });

  //   return successResponse(data, 'User unblocked successfully');
  // }

  @Delete(':userId')
  @ValidateAdmin()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user (soft delete)',
    description:
      'Permanently deactivate a user account. Super admin accounts cannot be deleted. The user can be restored later if needed.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account has been deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: "We couldn't find the user you're trying to delete.",
  })
  @ApiResponse({
    status: 400,
    description: 'Super admin accounts cannot be deleted for security reasons.',
  })
  async deleteUser(@Param('userId') userId: string) {
    await this.userService.deleteUser(userId);
    return successResponse(null, 'User account has been deleted successfully');
  }

  @Post(':userId/restore')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore deleted user',
    description:
      'Restore a previously deleted user account and reactivate their access to the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account has been restored successfully',
  })
  @ApiResponse({
    status: 404,
    description: "We couldn't find the user you're trying to restore.",
  })
  async restoreUser(@Param('userId') userId: string) {
    const user = await this.userService.restoreUser(userId);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'User account has been restored successfully');
  }

  @Get('count')
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user card statistics',
    description:
      'Retrieve comprehensive user statistics including total users, pending registrations, active users, and inactive accounts.',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics have been retrieved successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'User statistics have been retrieved successfully',
        data: {
          totalUsers: 45,
          pendingUsers: 5,
          activeUsers: 38,
          inactiveUsers: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'You are not authorized to access this resource',
  })
  @ApiResponse({
    status: 500,
    description: 'Something went wrong on our end. Please try again later.',
  })
  async getUserCard() {
    const data = await this.userService.getUserCard();
    return successResponse(
      data,
      'User statistics have been retrieved successfully',
    );
  }

  @Patch('me/avatar')
  @ValidateEmployee()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update current user avatar',
    description:
      'Upload and set avatar image for the authenticated user. The image will be uploaded to S3/Cloudinary storage.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for avatar (jpg, jpeg, png, gif, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'Avatar has been updated successfully',
    errors: [
      {
        status: 400,
        message: 'Image file is required',
      },
      {
        status: 404,
        message: "We couldn't find your account. Please log in again.",
      },
      { status: 401, message: 'You are not authorized to perform this action' },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async updateMyAvatar(
    @GetUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const user = await this.userService.updateUserAvatar(userId, file);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Avatar has been updated successfully');
  }

  @Delete('me/avatar')
  @ValidateEmployee()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete current user avatar',
    description: 'Remove the avatar from the authenticated user profile',
  })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'Avatar has been deleted successfully',
    errors: [
      {
        status: 404,
        message: "We couldn't find your account. Please log in again.",
      },
      { status: 401, message: 'You are not authorized to perform this action' },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async deleteMyAvatar(@GetUserId() userId: string) {
    const user = await this.userService.deleteUserAvatar(userId);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Avatar has been deleted successfully');
  }

  @Patch(':userId/avatar')
  @ValidateAdmin()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user avatar (Admin)',
    description:
      'Admin endpoint to upload and set a user avatar by user ID. The image will be uploaded to S3/Cloudinary storage.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for avatar (jpg, jpeg, png, gif, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'User avatar has been updated successfully',
    errors: [
      {
        status: 400,
        message: 'Image file is required',
      },
      {
        status: 404,
        message: "We couldn't find the user you're trying to update.",
      },
      { status: 401, message: 'You are not authorized to perform this action' },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async updateUserAvatarAdmin(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const user = await this.userService.updateUserAvatar(userId, file);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'User avatar has been updated successfully');
  }

  @Delete(':userId/avatar')
  @ValidateAdmin()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user avatar (Admin)',
    description: 'Admin endpoint to remove a user avatar by user ID',
  })
  @ApiResponseTypeChecker({
    model: UserResponseDto,
    successStatus: 200,
    successMessage: 'User avatar has been deleted successfully',
    errors: [
      {
        status: 404,
        message: "We couldn't find the user you're trying to update.",
      },
      { status: 401, message: 'You are not authorized to perform this action' },
      {
        status: 500,
        message: 'Something went wrong on our end. Please try again later.',
      },
    ],
  })
  async deleteUserAvatarAdmin(@Param('userId') userId: string) {
    const user = await this.userService.deleteUserAvatar(userId);
    const data = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'User avatar has been deleted successfully');
  }

  @Get('user-dashboard/summary')
  @ValidateEmployee()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user dashboard summary',
    description:
      'Get summary statistics for users based on account status including active, inactive, and pending counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'User dashboard summary retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'You are not authorized to access this resource',
  })
  async getUserDashboardSummary() {
    return await this.userService.getUserDashboardSummary();
  }
}
