import { PaymentStatus } from '@prisma';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(['PENDING', 'COMPLETED'], {
    message: 'paymentStatus must be either PENDING or COMPLETED',
  })
  @IsNotEmpty()
  paymentStatus: PaymentStatus;
}
