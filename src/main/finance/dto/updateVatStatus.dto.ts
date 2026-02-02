import { IsEnum, IsNotEmpty } from 'class-validator';

export enum VatStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  PAID = 'PAID',
}

export class UpdateVatStatusDto {
  @IsEnum(VatStatus)
  @IsNotEmpty()
  vatStatus: VatStatus;
}
