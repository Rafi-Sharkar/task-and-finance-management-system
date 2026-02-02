import { Module } from '@nestjs/common';
import { FileModule } from '../../lib/file/file.module';
import { AuditModule } from '../audit/audit.module';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [FileModule, AuditModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
