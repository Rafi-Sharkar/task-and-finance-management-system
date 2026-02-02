import { CashType } from '@prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SearchCashDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CashType)
  cashType?: CashType;
}
