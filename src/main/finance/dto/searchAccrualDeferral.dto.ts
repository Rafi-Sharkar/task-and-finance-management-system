import { PostingStatus } from '@prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SearchAccrualDeferralDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PostingStatus)
  status?: PostingStatus;
}
