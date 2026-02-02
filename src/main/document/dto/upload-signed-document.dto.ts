import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UploadSignedDocumentDto {
  @ApiProperty({
    description: 'Document ID to upload signed version',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  documentId: string;

  @ApiProperty({
    description: 'File ID to upload signed version',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  fileId: string;

  @ApiProperty({
    description: 'Old file URL to upload signed version',
    example: 'https://example.com/old-file.pdf',
  })
  oldFileUrl: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Signed document file',
  })
  file: Express.Multer.File;
}
