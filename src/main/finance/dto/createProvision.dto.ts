import { PostingStatus } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProvisionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  expectedValue: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  probability: number;

  @IsOptional()
  @IsEnum(PostingStatus)
  provisionStatus: PostingStatus;

  @IsOptional()
  @IsString()
  description?: string;
}
