import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountValidationService } from './account-validation.service';
import { IS_PUBLIC_KEY } from './jwt.constants';
import { RequestWithUser } from './jwt.interface';

/**
 * Advanced auth guard with account status validation
 * Use this guard to validate not just JWT but also account status
 */
@Injectable()
export class AdvancedAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdvancedAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accountValidation: AccountValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip validation for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Validate JWT payload structure
      if (!this.accountValidation.validatePayload(user)) {
        throw new ForbiddenException('Invalid JWT payload');
      }

      // Validate account status
      await this.accountValidation.validateAccountStatus(user.sub);

      // Attach validated user to request for later use
      request.user = user;

      this.logger.debug(
        `User ${user.email} (${user.sub}) authenticated and validated`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Authentication validation failed for user ${user.sub}: ${error.message}`,
      );
      throw error;
    }
  }
}
