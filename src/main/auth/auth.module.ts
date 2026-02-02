import { FileModule } from '@/lib/file/file.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SmNotificationModule } from '../sm-notification/sm-notification.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [FileModule, AuditModule, RedisModule, SmNotificationModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
