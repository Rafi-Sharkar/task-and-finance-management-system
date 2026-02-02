import { Module } from '@nestjs/common';
import { AiResourceService } from './ai-resource.service';
import { AiResourceController } from './ai-resource.controller';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Module({
  controllers: [AiResourceController],
  providers: [AiResourceService, PrismaService],
})
export class AiResourceModule {}
