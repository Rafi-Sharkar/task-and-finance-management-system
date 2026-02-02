import { FileModule } from '@/lib/file/file.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CloudinaryService } from '@/lib/file/services/cloudinary.service';

@Module({
  controllers: [UserController],
  providers: [UserService, CloudinaryService],
  imports: [AuditModule, FileModule],
  exports: [UserService],
})
export class UserModule {}
