import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateFolderDto {
  @ApiProperty({
    description: 'New folder name',
    example: 'Updated Folder Name',
    minLength: 1,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Folder name must not be empty' })
  name: string;
}
