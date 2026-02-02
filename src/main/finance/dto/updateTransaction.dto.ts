import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateTransactionDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
