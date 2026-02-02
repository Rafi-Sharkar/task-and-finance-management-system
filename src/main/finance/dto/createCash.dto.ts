import { Type } from 'class-transformer';
import {
  Allow,
  IsDate,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

enum CashType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export class CreateCashDto {
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  cashDate: Date;

  @IsNotEmpty()
  @IsString()
  invoiceId: string;

  @IsNotEmpty()
  @IsEnum(CashType)
  cashType: CashType;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  cashOut: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  cashIn: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  balance: number;

  @IsOptional()
  @IsString()
  description?: string;

  @Allow()
  files?: any; // Allow files property from multipart/form-data
}
