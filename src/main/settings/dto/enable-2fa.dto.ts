import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({
    description: 'Mobile number with country code',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Mobile number must be in international format (e.g., +1234567890)',
  })
  mobileNumber: string;
}
