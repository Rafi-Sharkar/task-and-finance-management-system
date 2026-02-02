import { IsOptional, IsString } from 'class-validator';

export class SearchTransactionDto {
  @IsOptional()
  @IsString()
  description?: string;
}
