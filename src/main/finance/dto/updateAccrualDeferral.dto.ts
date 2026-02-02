import { AccrualType, PostingStatus } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAccrualDeferralDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsEnum(AccrualType)
  type?: AccrualType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PostingStatus)
  status?: PostingStatus;
}
