import { UserAccountStatus, UserRole } from '@prisma';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  // ===== Identity =====
  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  phone: string;

  @Expose()
  avatarUrl?: string;

  // ===== Settings =====
  @Expose()
  role: UserRole;

  @Expose()
  accountStatus: UserAccountStatus;

  @Expose()
  isActive: boolean;

  @Expose()
  isVerified: boolean;

  @Expose()
  isDeleted: boolean;

  // ===== Logout / activity tracking =====
  @Expose()
  lastLogin?: Date;

  @Expose()
  lastActive?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
