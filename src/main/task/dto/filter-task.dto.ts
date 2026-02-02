import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from './create-task.dto';

export class FilterTaskDto {
  @ApiProperty({
    description: 'Filter by task priority',
    enum: TaskPriority,
    required: false,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Filter by task status',
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter by deadline (ISO date string)',
    required: false,
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ description: 'Search by task title', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}
