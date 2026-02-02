import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBankReconciliationDto {
  @IsNotEmpty()
  @IsString()
  invoiceId: string;
}
