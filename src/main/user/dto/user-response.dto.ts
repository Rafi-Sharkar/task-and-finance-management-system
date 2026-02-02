import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  fullName?: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  phone?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  role: string;

  @Expose()
  accountStatus: string;

  @Expose()
  isActive: boolean;

  @Expose()
  isVerified: boolean;

  @Expose()
  isDeleted: boolean;

  @Expose()
  lastActive?: Date;

  @Expose()
  lastLogin?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
