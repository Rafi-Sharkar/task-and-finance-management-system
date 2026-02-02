import { PrismaService } from '@/lib/prisma/prisma.service';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UserAccountStatus } from '@prisma';
import { JWTPayload } from './jwt.interface';

/**
 * Service for account validation checks
 */
@Injectable()
export class AccountValidationService {
  private readonly logger = new Logger(AccountValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate user account status and permissions
   * @param userId - The user ID from JWT payload
   * @returns Promise<User> - The validated user
   */
  async validateAccountStatus(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User account not found');
    }

    if (user.isDeleted) {
      this.logger.warn(`Deleted user attempted to access: ${userId}`);
      throw new ForbiddenException('Account has been deleted');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is not active');
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Email not verified. Please verify your email first',
      );
    }

    // Check account status
    switch (user.accountStatus) {
      case UserAccountStatus.PENDING:
        throw new ForbiddenException('Account activation is pending');

      case UserAccountStatus.INACTIVE:
        throw new ForbiddenException('Account is inactive');

      case UserAccountStatus.ACTIVE:
        // Continue processing
        break;

      default:
        throw new ForbiddenException('Invalid account status');
    }

    return user;
  }

  /**
   * Check if user has specific role
   */
  async validateUserRole(
    userId: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }

  /**
   * Validate JWT payload integrity and claims
   */
  validatePayload(payload: JWTPayload): boolean {
    // Check required fields
    if (!payload.sub || !payload.email || !payload.role) {
      this.logger.warn('Invalid JWT payload structure');
      return false;
    }

    // Additional validations can be added here
    return true;
  }

  /**
   * Check if user has permission for specific action
   */
  async validatePermission(
    userId: string,
    resourceOwnerId: string,
    allowSelfOnly: boolean = true,
  ): Promise<boolean> {
    if (allowSelfOnly && userId !== resourceOwnerId) {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Allow admins and super admins to access other users' resources
      return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    }

    return true;
  }
}
