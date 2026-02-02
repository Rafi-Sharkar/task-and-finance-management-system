import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum DocumentStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export enum ShareTypes {
  VIEW = 'VIEW',
  SIGN = 'SIGN',
}

export enum DocumentCategory {
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

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Folder ID where document belongs' })
  @IsUUID()
  @IsNotEmpty()
  folderId: string;

  @ApiProperty({
    description: 'Client ID to share document with',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Single file to upload (only 1 file allowed)',
  })
  @IsOptional()
  @ArrayMaxSize(1, { message: 'You can only upload one file per document' })
  files?: any[];
}
