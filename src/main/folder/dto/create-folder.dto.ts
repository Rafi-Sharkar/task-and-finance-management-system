import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({
    description: 'Folder name',
    example: 'Project Documents',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Folder name must not be empty' })
  name: string;

  @ApiProperty({
    description: 'Parent folder ID (optional)',
    example: 'a5a1f2f0-1234-4b5c-9a8e-abcdef012345',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
