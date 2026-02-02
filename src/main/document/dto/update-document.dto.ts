import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentStatus } from './create-document.dto';

export class UpdateDocumentDto {
  @ApiProperty({ description: 'Document name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'New file to replace existing (optional)',
    required: false,
  })
  @IsOptional()
  file?: any;
}
