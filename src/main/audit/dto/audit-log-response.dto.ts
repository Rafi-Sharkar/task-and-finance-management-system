import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Action performed' })
  action: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'User information', required: false })
  user?: {
    id: string;
    username: string;
    email: string;
    fullName?: string | null;
    role: string;
  };
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ description: 'Audit logs', type: [AuditLogResponseDto] })
  data: AuditLogResponseDto[];

  @ApiProperty({ description: 'Total count of logs' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Limit per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}
