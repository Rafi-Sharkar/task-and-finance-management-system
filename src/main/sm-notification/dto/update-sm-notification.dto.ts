import { PartialType } from '@nestjs/swagger';
import { CreateSmNotificationDto } from './create-sm-notification.dto';

export class UpdateSmNotificationDto extends PartialType(
  CreateSmNotificationDto,
) {}
