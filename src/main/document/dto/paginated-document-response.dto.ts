import { ApiProperty } from '@nestjs/swagger';
import { DocumentResponseDto } from './document-response.dto';

export class PaginatedDocumentResponseDto {
  @ApiProperty({
    description: 'Documents',
    type: [DocumentResponseDto],
  })
  data: DocumentResponseDto[];

  @ApiProperty({ description: 'Total count of documents' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Limit per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}
