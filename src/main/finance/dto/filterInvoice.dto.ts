import { InvoiceType } from '@prisma';
import { IsEnum, IsOptional } from 'class-validator';

export class FilterInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;
}
