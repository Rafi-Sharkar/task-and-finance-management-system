import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum ClientDocAction {
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  PENDING = 'PENDING',
}

export class UpdateDocStatusByClientDto {
  @ApiProperty({
    description: 'Document ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  docId: string;

  @ApiProperty({
    description: 'Client document action status',
    enum: ClientDocAction,
    example: 'VIEWED',
  })
  @IsEnum(ClientDocAction)
  @IsNotEmpty()
  statusByClient: ClientDocAction;
}
