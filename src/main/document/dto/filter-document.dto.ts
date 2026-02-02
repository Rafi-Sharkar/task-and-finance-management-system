import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

enum DocumentStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

enum DocumentCategory {
  CLIENT_INVOICE_IN = 'CLIENT_INVOICE_IN',
  ORG_INVOICE_OUT = 'ORG_INVOICE_OUT',
  PROJECT_DOC = 'PROJECT_DOC',
  TRANSACTION = 'TRANSACTION',
  CASH_MANAGEMENT = 'CASH_MANAGEMENT',
  PAYMENT_PROCESS = 'PAYMENT_PROCESS',
  ORG_OTHER_INVOICE = 'ORG_OTHER_INVOICE',
  PROFIT_AND_LOSS = 'PROFIT_AND_LOSS',
  OTHERS = 'OTHERS',
}

enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT',
  FINANCE = 'FINANCE',
}

export class FilterDocumentDto {
  @ApiProperty({
    description: 'Filter by user ID',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Filter by username (partial match)',
    required: false,
    example: 'john.doe',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Search document name (partial match)',
    required: false,
    example: 'Invoice',
  })
  @IsString()
  @IsOptional()
  documentName?: string;

  @ApiProperty({
    description: 'Filter by document category',
    enum: DocumentCategory,
    required: false,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  type?: DocumentCategory;

  @ApiProperty({
    description: 'Filter by document status',
    enum: DocumentStatus,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({
    description: 'Filter by uploader role',
    enum: UserRole,
    required: false,
  })
  @IsEnum(UserRole)
  @IsOptional()
  uploaderRole?: UserRole;

  @ApiProperty({
    description: 'Filter documents created from this date',
    type: 'string',
    format: 'date-time',
    required: false,
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Filter documents created until this date',
    type: 'string',
    format: 'date-time',
    required: false,
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    type: 'integer',
    minimum: 1,
    default: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of records per page',
    type: 'integer',
    minimum: 1,
    default: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
