import { Optional } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma';
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreatePaymentDto {
  @Optional()
  @IsString()
  vendor: string;

  @IsNotEmpty()
  @IsString()
  invoiceId: string;

  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '1,2' })
  amount: number;

  @IsNotEmpty()
  @IsEnum(['BANK', 'CASH', 'CARD'])
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @Optional()
  @IsEnum(['COMPLETED', 'PENDING'])
  paymentStatus: PaymentStatus;
}
