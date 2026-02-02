import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'sheikhchamon8@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, example: 'chamon123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole', example: 'SUPER_ADMIN' })
  @IsEnum(UserRole)
  role: UserRole;
}
