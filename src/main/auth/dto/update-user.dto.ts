import { ApiProperty } from '@nestjs/swagger';
import { UserAccountStatus, UserRole } from '@prisma';
import {
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'Username of the user',
    example: 'johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john@example.com',
    required: false,
  })
  @ApiProperty({
    description: 'Phone number of the user',
    example: '+1704000000001',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.EMPLOYEE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'Account status',
    enum: UserAccountStatus,
    example: UserAccountStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  accountStatus?: UserAccountStatus;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file',
    required: false,
  })
  avatar?: Express.Multer.File;
}
