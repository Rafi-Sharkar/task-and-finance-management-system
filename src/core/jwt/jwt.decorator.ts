import { UserEnum } from '@/common/enum/user.enum';
import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AdvancedAuthGuard } from './advanced-auth.guard';
import { AdvancedRolesGuard } from './advanced-roles.guard';
import { IS_PUBLIC_KEY, ROLES_KEY } from './jwt.constants';
import { JwtAuthGuard, RolesGuard } from './jwt.guard';
import { JWTPayload, RequestWithUser } from './jwt.interface';

// ============================================
// Metadata Decorators
// ============================================

// Roles metadata
export const Roles = (...roles: UserEnum[]) => SetMetadata(ROLES_KEY, roles);

// Public decorator to skip auth guards
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ============================================
// Param Decorators
// ============================================

// GetUser decorator - extracts user from request
export const GetUser = createParamDecorator(
  (data: keyof JWTPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user as JWTPayload | undefined;
    if (!user) return undefined;
    if (!data) return user;
    return user[data];
  },
);

// GetUserId decorator - extracts only user ID
export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.sub;
  },
);

// ============================================
// Guard Decorators (Basic)
// ============================================

/**
 * Basic JWT authentication guard
 * Only validates JWT signature and user existence
 */
export function ValidateAuth(...roles: UserEnum[]) {
  const decorators = [UseGuards(JwtAuthGuard, RolesGuard)];
  if (roles.length > 0) {
    decorators.push(Roles(...roles));
  }
  return applyDecorators(...decorators);
}

// ============================================
// Guard Decorators (Advanced)
// ============================================

/**
 * Advanced authentication with account status validation
 * Validates JWT signature, user existence, and account status
 */
export function ValidateAuthWithStatus(...roles: UserEnum[]) {
  const decorators = [UseGuards(AdvancedAuthGuard, AdvancedRolesGuard)];
  if (roles.length > 0) {
    decorators.push(Roles(...roles));
  }
  return applyDecorators(...decorators);
}

// ============================================
// Convenience Decorators (Basic)
// ============================================

export function ValidateSuperAdmin() {
  return ValidateAuth(UserEnum.SUPER_ADMIN);
}

export function ValidateAdmin() {
  return ValidateAuth(UserEnum.ADMIN, UserEnum.SUPER_ADMIN);
}

export function ValidateManager() {
  return ValidateAuth(UserEnum.MANAGER, UserEnum.ADMIN, UserEnum.SUPER_ADMIN);
}
export function ValidateFinance() {
  return ValidateAuth(
    UserEnum.FINANCE,
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
  );
}
export function ValidateClient() {
  return ValidateAuth(
    UserEnum.CLIENT,
    UserEnum.USER,
    UserEnum.EMPLOYEE,
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
  );
}
export function ValidateUser() {
  return ValidateAuth(
    UserEnum.USER,
    UserEnum.EMPLOYEE,
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
    UserEnum.FINANCE,
    UserEnum.CLIENT,
  );
}

export function ValidateEmployee() {
  return ValidateAuth(
    UserEnum.EMPLOYEE,
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
    UserEnum.FINANCE,
    UserEnum.USER,
    UserEnum.CLIENT,
  );
}

// ============================================
// Convenience Decorators (Advanced)
// ============================================

export function ValidateSuperAdminWithStatus() {
  return ValidateAuthWithStatus(UserEnum.SUPER_ADMIN);
}

export function ValidateAdminWithStatus() {
  return ValidateAuthWithStatus(UserEnum.ADMIN, UserEnum.SUPER_ADMIN);
}

export function ValidateManagerWithStatus() {
  return ValidateAuthWithStatus(
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
  );
}

export function ValidateEmployeeWithStatus() {
  return ValidateAuthWithStatus(
    UserEnum.EMPLOYEE,
    UserEnum.MANAGER,
    UserEnum.ADMIN,
    UserEnum.SUPER_ADMIN,
  );
}
