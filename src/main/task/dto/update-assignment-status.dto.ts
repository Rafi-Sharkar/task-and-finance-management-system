import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TaskAssignmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NOT_COMPLETED = 'NOT_COMPLETED',
}

export class UpdateAssignmentStatusDto {
  @ApiProperty({
    description: 'Assignment status',
    enum: TaskAssignmentStatus,
    example: 'COMPLETED',
  })
  @IsEnum(TaskAssignmentStatus)
  @IsNotEmpty()
  status: TaskAssignmentStatus;
}
