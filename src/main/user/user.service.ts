import { PaginationHelper } from '@/common/utils/pagination.helper';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CloudinaryService } from '@/lib/file/services/cloudinary.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma';
import { AuditService } from '../audit/audit.service';
import { FilterUserDto } from './dto/filter-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async getAllUsers(
    filters: FilterUserDto,
    currentUserId?: string,
    currentUserRole?: string,
  ) {
    try {
      this.logger.log('Fetching users with filters');

      const { page = 1, limit = 10, ...filterParams } = filters;

      const pageNumber = Number(page);
      const limitNumber = Number(limit);

      const skip = PaginationHelper.getSkip(pageNumber, limitNumber);

      // const skip = PaginationHelper.getSkip(page, limit);

      const where: any = {};

      if (filterParams.role) {
        where.role = filterParams.role;
      }

      if (filterParams.accountStatus) {
        where.accountStatus = filterParams.accountStatus;
        // If filtering for INACTIVE users, ensure they are not deleted
        if (filterParams.accountStatus === 'INACTIVE') {
          where.isDeleted = false;
        }
      }

      // If current user is an admin, exclude super admins and their own data
      if (
        currentUserId &&
        (currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER')
      ) {
        where.AND = [
          { role: { not: 'SUPER_ADMIN' } },
          { id: { not: currentUserId } },
        ];
      }

      if (filterParams.isActive !== undefined) {
        where.isActive = filterParams.isActive;
      }

      if (filterParams.isVerified !== undefined) {
        where.isVerified = filterParams.isVerified;
      }

      if (filterParams.search) {
        where.OR = [
          { fullName: { contains: filterParams.search, mode: 'insensitive' } },
          { username: { contains: filterParams.search, mode: 'insensitive' } },
          { email: { contains: filterParams.search, mode: 'insensitive' } },
        ];
      }

      if (filterParams.createdDate) {
        const createdDate = new Date(filterParams.createdDate);
        where.createdAt = {
          gte: new Date(createdDate.setHours(0, 0, 0, 0)),
          lte: new Date(createdDate.setHours(23, 59, 59, 999)),
        };
      }

      where.isDeleted = false;
      const [users, total] = await Promise.all([
        this.prisma.client.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            avatarUrl: true,
            role: true,
            accountStatus: true,
            isActive: true,
            isVerified: true,
            isDeleted: true,
            lastActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.client.user.count({ where }),
      ]);

      return PaginationHelper.buildResponse(users, total, page, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      this.logger.log(`Fetching user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
          lastActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find the user you're looking for. Please check the user ID and try again.",
        );
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    try {
      this.logger.log(`Updating user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find the user you're trying to update. Please verify the user ID.",
        );
      }

      if (user.isDeleted) {
        throw new BadRequestException(
          'This user account has been deleted and cannot be updated. Please restore it first if you want to ma  ke changes.',
        );
      }

      // Check unique constraints
      if (dto.email && dto.email !== user.email) {
        const emailExists = await this.prisma.client.user.findUnique({
          where: { email: dto.email },
        });
        if (emailExists) {
          throw new BadRequestException(
            'This email address is already in use. Please choose a different email.',
          );
        }
      }

      if (dto.username && dto.username !== user.username) {
        const usernameExists = await this.prisma.client.user.findUnique({
          where: { username: dto.username },
        });
        if (usernameExists) {
          throw new BadRequestException(
            'This username is already taken. Please choose a different username.',
          );
        }
      }

      if (dto.phone && dto.phone !== user.phone) {
        const phoneExists = await this.prisma.client.user.findUnique({
          where: { phone: dto.phone },
        });
        if (phoneExists) {
          throw new BadRequestException(
            'This phone number is already registered. Please use a different phone number.',
          );
        }
      }

      const updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.username && { username: dto.username }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          ...(dto.role && { role: dto.role as any }),
          ...(dto.accountStatus && { accountStatus: dto.accountStatus as any }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
          lastActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.debug(`User updated successfully: ${userId}`);

      // Create audit log for user update
      await this.auditService.createLog({
        userId: updatedUser.id,
        action: 'USER_UPDATED',
      });

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // /**
  //  * Block user
  //  */
  // async blockUser(userId: string) {
  //   try {
  //     this.logger.log(`Blocking user ${userId}`);

  //     const user = await this.prisma.client.user.findUnique({
  //       where: { id: userId },
  //     });

  //     if (!user) {
  //       throw new NotFoundException('User not found');
  //     }

  //     if (user.isDeleted) {
  //       throw new BadRequestException('Cannot block deleted user');
  //     }

  //     if (user.accountStatus === 'BLOCKED') {
  //       throw new BadRequestException('User is already blocked');
  //     }

  //     const blockedUser = await this.prisma.client.user.update({
  //       where: { id: userId },
  //       data: {
  //         accountStatus: 'BLOCKED',
  //         isActive: false,
  //         updatedAt: new Date(),
  //       },
  //       select: {
  //         id: true,
  //         fullName: true,
  //         username: true,
  //         email: true,
  //         phone: true,
  //         avatarUrl: true,
  //         role: true,
  //         accountStatus: true,
  //         isActive: true,
  //         isVerified: true,
  //         isDeleted: true,
  //         lastActive: true,
  //         lastLogin: true,
  //         createdAt: true,
  //         updatedAt: true,
  //       },
  //     });

  //     this.logger.debug(`User blocked successfully: ${userId}`);

  //     // Create audit log for blocking user
  //     await this.auditService.createLog({
  //       userId: blockedUser.id,
  //       action: 'USER_BLOCKED',
  //     });

  //     return blockedUser;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /**
  //  * Unblock user
  //  */
  // async unblockUser(userId: string) {
  //   try {
  //     this.logger.log(`Unblocking user ${userId}`);

  //     const user = await this.prisma.client.user.findUnique({
  //       where: { id: userId },
  //     });

  //     if (!user) {
  //       throw new NotFoundException('User not found');
  //     }

  //     if (user.accountStatus !== 'INACTIVE') {
  //       throw new BadRequestException('User is inactive state');
  //     }

  //     const unblockedUser = await this.prisma.client.user.update({
  //       where: { id: userId },
  //       data: {
  //         accountStatus: 'ACTIVE',
  //         isActive: true,
  //         updatedAt: new Date(),
  //       },
  //       select: {
  //         id: true,
  //         fullName: true,
  //         username: true,
  //         email: true,
  //         phone: true,
  //         avatarUrl: true,
  //         role: true,
  //         accountStatus: true,
  //         isActive: true,
  //         isVerified: true,
  //         isDeleted: true,
  //         lastActive: true,
  //         lastLogin: true,
  //         createdAt: true,
  //         updatedAt: true,
  //       },
  //     });

  //     this.logger.debug(`User unblocked successfully: ${userId}`);

  //     // Create audit log for unblocking user
  //     await this.auditService.createLog({
  //       userId: unblockedUser.id,
  //       action: 'USER_UNBLOCKED',
  //     });

  //     return unblockedUser;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string) {
    try {
      this.logger.log(`Deleting user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find the user you're trying to delete. Please verify the user ID.",
        );
      }

      if (user.isDeleted) {
        throw new BadRequestException(
          'This user account has already been deleted.',
        );
      }

      if (user.role === 'SUPER_ADMIN') {
        throw new BadRequestException(
          'Super admin accounts cannot be deleted for security reasons.',
        );
      }

      const deletedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          isActive: false,
          accountStatus: 'INACTIVE',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
          lastActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.debug(`User soft-deleted successfully: ${userId}`);

      // Create audit log for deleting user
      await this.auditService.createLog({
        userId: deletedUser.id,
        action: 'USER_DELETED',
      });

      return deletedUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore deleted user
   */
  async restoreUser(userId: string) {
    try {
      this.logger.log(`Restoring user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find the user you're trying to restore. Please verify the user ID.",
        );
      }

      if (!user.isDeleted) {
        throw new BadRequestException(
          "This user account is already active and doesn't need to be restored.",
        );
      }

      const restoredUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          isDeleted: false,
          isActive: true,
          accountStatus: 'ACTIVE',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
          lastActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.debug(`User restored successfully: ${userId}`);

      // Create audit log for restoring user
      await this.auditService.createLog({
        userId: restoredUser.id,
        action: 'USER_RESTORED',
      });

      return restoredUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user card statistics
   */
  async getUserCard() {
    try {
      this.logger.log('Fetching user card statistics');

      const [totalUsers, pendingUsers, activeUsers, inactiveUsers] =
        await Promise.all([
          // Total users (excluding deleted)
          this.prisma.client.user.count({
            where: { isDeleted: false },
          }),

          // Pending users (accountStatus = PENDING and not deleted)
          this.prisma.client.user.count({
            where: {
              accountStatus: 'PENDING',
              isDeleted: false,
            },
          }),

          // Active users (accountStatus = ACTIVE and not deleted)
          this.prisma.client.user.count({
            where: {
              accountStatus: 'ACTIVE',
              isDeleted: false,
            },
          }),

          // Inactive users (accountStatus = INACTIVE and not deleted)
          this.prisma.client.user.count({
            where: {
              accountStatus: 'INACTIVE',
              isDeleted: false,
            },
          }),
        ]);

      return {
        totalUsers,
        pendingUsers,
        activeUsers,
        inactiveUsers,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all employees
   */
  async getAllEmployees() {
    try {
      this.logger.log('Fetching all employees');

      const employees = await this.prisma.client.user.findMany({
        where: {
          role: UserRole.EMPLOYEE,
          isDeleted: false,
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return employees;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user avatar with file upload
   */
  async updateUserAvatar(userId: string, file: Express.Multer.File) {
    try {
      this.logger.log(`Updating avatar for user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find your account. Please log in again.",
        );
      }

      // Validate file
      if (!file || file.size === 0) {
        throw new BadRequestException('Image file is required');
      }

      // Validate file type
      const allowedMimeTypes = [
        ,
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only JPEG, PNG, GIF, and WebP images are allowed',
        );
      }

      // Validate file size (max 5MB)
      const maxFileSize = 5 * 1024 * 1024;
      if (file.size > maxFileSize) {
        throw new BadRequestException('File size must not exceed 5MB');
      }

      // Upload file to Cloudinary
      this.logger.log(`Uploading avatar file for user ${userId} to Cloudinary`);
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'avatars',
      );

      const avatarUrl = uploadResult.secure_url;

      // Update user with avatar URL
      const updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          avatarUrl,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await this.auditService.createLog({
        userId,
        action: 'AVATAR_UPDATED',
      });

      this.logger.log(
        `Avatar updated successfully for user ${userId}: ${avatarUrl}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update avatar for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteUserAvatar(userId: string) {
    try {
      this.logger.log(`Deleting avatar for user ${userId}`);

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(
          "We couldn't find your account. Please log in again.",
        );
      }

      const updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          avatarUrl: null,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await this.auditService.createLog({
        userId,
        action: 'AVATAR_DELETED',
      });

      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to delete avatar for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserDashboardSummary() {
    try {
      this.logger.log('Fetching user dashboard summary');

      const totalUsers = await this.prisma.client.user.count({
        where: { isDeleted: false },
      });

      const activeUsers = await this.prisma.client.user.count({
        where: {
          accountStatus: 'ACTIVE',
          isDeleted: false,
        },
      });

      const inactiveUsers = await this.prisma.client.user.count({
        where: {
          accountStatus: 'INACTIVE',
          isDeleted: false,
        },
      });

      const pendingUsers = await this.prisma.client.user.count({
        where: {
          accountStatus: 'PENDING',
          isDeleted: false,
        },
      });

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          pendingUsers,
        },
        message: 'User dashboard summary retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to fetch user dashboard summary:', error);
      throw new BadRequestException(
        `Failed to fetch user dashboard summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
