import { PostingStatus } from '@prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SearchProvisionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PostingStatus)
  provisionStatus?: PostingStatus;
}
