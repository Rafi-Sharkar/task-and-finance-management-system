import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TaskStatusEnum {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NOT_COMPLETED = 'NOT_COMPLETED',
}

export class UpdateTaskStatusDto {
  @ApiProperty({
    description: 'Task status to update to',
    enum: TaskStatusEnum,
    example: 'COMPLETED',
  })
  @IsEnum(TaskStatusEnum)
  @IsNotEmpty()
  status: TaskStatusEnum;
}
