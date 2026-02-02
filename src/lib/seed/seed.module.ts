import { Global, Module } from '@nestjs/common';
import { FileService } from './services/file.service';
import { SuperAdminService } from './services/super-admin.service';
import { TestUsersService } from './services/test-users.service';

@Global()
@Module({
  imports: [],
  providers: [SuperAdminService, TestUsersService, FileService],
})
export class SeedModule {}
