import { Expose } from 'class-transformer';

export class TaskResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  createdBy: string;

  @Expose()
  deadline?: Date;

  @Expose()
  priority: string;

  @Expose()
  note?: string;

  @Expose()
  status: string;

  @Expose()
  isDeleted: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };

  @Expose()
  assignments?: Array<{
    id: string;
    employeeId: string;
    assignedBy: string;
    status: string;
    completedAt?: Date;
    assignedAt: Date;
    employee: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}
