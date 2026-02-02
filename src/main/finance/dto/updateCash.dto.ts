import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateCashDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashIn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashOut?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalbalance?: number;
}
