import { ReconciliationStatus } from '@prisma';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateReconciliationStatusDto {
  @IsEnum(['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'], {
    message:
      'reconciliationStatus must be either PENDING, ADJUSTMENT, MATCH, or FAILED',
  })
  @IsNotEmpty()
  reconciliationStatus: ReconciliationStatus;
}
