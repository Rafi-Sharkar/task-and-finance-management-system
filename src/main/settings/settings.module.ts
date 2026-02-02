import { RedisModule } from '@/lib/redis/redis.module';
import { TwilioModule } from '@/lib/twilio/twilio.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TwilioModule, RedisModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
