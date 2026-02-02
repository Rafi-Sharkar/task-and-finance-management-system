import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'sheikhchamon8@gmail.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ minLength: 6, example: 'chamon123' })
  @IsString()
  @MinLength(6)
  password: string;
}
