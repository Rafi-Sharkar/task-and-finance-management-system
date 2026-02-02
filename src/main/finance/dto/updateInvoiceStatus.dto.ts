import { InvoiceStatus } from '@prisma';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateInvoiceStatusDto {
  @IsEnum(['PENDING', 'PAID', 'DUE'], {
    message: 'invoiceStatus must be either PENDING, PAID, or DUE',
  })
  @IsNotEmpty()
  invoiceStatus: InvoiceStatus;
}
