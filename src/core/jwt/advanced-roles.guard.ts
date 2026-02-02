import { UserEnum } from '@/common/enum/user.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from './jwt.constants';
import { RequestWithUser } from './jwt.interface';

/**
 * Enhanced roles guard with database verification
 */
@Injectable()
export class AdvancedRolesGuard implements CanActivate {
  private readonly logger = new Logger(AdvancedRolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role metadata -> allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Verify user role in database (to ensure token hasn't been issued with old role)
      const dbUser = await this.prisma.client.user.findUnique({
        where: { id: user.sub },
        select: { id: true, role: true, isActive: true },
      });

      if (!dbUser) {
        this.logger.warn(`User not found in database: ${user.sub}`);
        throw new ForbiddenException('User not found');
      }

      if (!dbUser.isActive) {
        throw new ForbiddenException('User account is inactive');
      }

      const userRoles: string[] = Array.isArray(dbUser.role)
        ? (dbUser.role as unknown as string[])
        : [dbUser.role as unknown as string];
      const hasRole = requiredRoles.some((role) =>
        userRoles.includes(role as string),
      );

      if (!hasRole) {
        this.logger.warn(
          `User ${user.sub} does not have required roles: ${requiredRoles.join(', ')}`,
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
        );
      }

      this.logger.debug(
        `User ${user.sub} authorized with role: ${dbUser.role}`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Role validation failed: ${error.message}`);
      throw new ForbiddenException('Authorization failed');
    }
  }
}
