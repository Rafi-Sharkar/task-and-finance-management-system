import { AccrualType, PostingStatus } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAccrualDeferralDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsNotEmpty()
  @IsEnum(AccrualType)
  type: AccrualType;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(PostingStatus)
  status?: PostingStatus;
}
