import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateVatReturnDto {
  @IsNotEmpty()
  @IsEnum(['MONTHLY', 'QUARTERLY'], {
    message: 'periodType must be either MONTHLY or QUARTERLY',
  })
  periodType: 'MONTHLY' | 'QUARTERLY';

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  years: number;

  @IsNotEmpty()
  @IsEnum(
    [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
      'Q1',
      'Q2',
      'Q3',
      'Q4',
    ],
    {
      message:
        'period must be a valid month (JANUARY-DECEMBER) or quarter (Q1-Q4)',
    },
  )
  period:
    | 'JANUARY'
    | 'FEBRUARY'
    | 'MARCH'
    | 'APRIL'
    | 'MAY'
    | 'JUNE'
    | 'JULY'
    | 'AUGUST'
    | 'SEPTEMBER'
    | 'OCTOBER'
    | 'NOVEMBER'
    | 'DECEMBER'
    | 'Q1'
    | 'Q2'
    | 'Q3'
    | 'Q4';
}
