import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Enable/disable login alerts',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  loginAlert?: boolean;

  @ApiProperty({
    description: 'Enable/disable automatic backups',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  automaticBackups?: boolean;

  @ApiProperty({
    description: 'Enable/disable desktop notifications',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  desktopNotification?: boolean;

  @ApiProperty({
    description: 'Enable/disable email notifications',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotification?: boolean;

  @ApiProperty({
    description: 'Enable/disable SMS notifications',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  smsNotification?: boolean;

  @ApiProperty({
    description: 'Enable/disable daily summaries',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  dailySummaries?: boolean;
}
