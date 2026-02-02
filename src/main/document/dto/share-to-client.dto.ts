import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ShareTypes } from './create-document.dto';

export class ShareToClientDto {
  @ApiProperty({ description: 'Document ID' })
  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: 'Client user ID' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Share type', enum: ShareTypes })
  @IsNotEmpty()
  shareType: ShareTypes;
}
