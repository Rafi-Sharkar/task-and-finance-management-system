import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'Website Redesign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Client ID (UUID)', example: 'a1b2c3d4-...' })
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Project description',
    required: false,
    example: 'Complete redesign of company website',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Project start date (ISO format)',
    required: false,
    example: '2026-01-10',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Project end date/deadline (ISO format)',
    required: false,
    example: '2026-03-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
    example: 'Client wants modern design with animations',
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    description: 'Project files',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  files?: any[];

  @ApiProperty({
    description:
      'Array of manager IDs to assign to this project (comma-separated string or array)',
    type: String,
    required: false,
    example: 'manager-uuid-1,manager-uuid-2',
  })
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    if (Array.isArray(value)) return value;
    return [];
  })
  @IsOptional()
  assignedManagers?: string[];
}
