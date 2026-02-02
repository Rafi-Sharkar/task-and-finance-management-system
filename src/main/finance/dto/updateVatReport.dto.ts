import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateVatReportDto {
  @IsString()
  @IsNotEmpty()
  jurisdictions: string;
}
