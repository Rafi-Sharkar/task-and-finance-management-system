import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'd0365de54660887f24c655a9743ba72a34f6e0a29a1c16327a5ba5ab62e8bd15',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
