import { Module } from '@nestjs/common';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';

import { UtilsModule } from './utils/utils.module';
import { FileModule } from './file/file.module';
import { SeedModule } from './seed/seed.module';
import { QueueModule } from './queue/queue.module';
import { PrivateMessageModule } from '@/main/private-message/private-message.module';

@Module({
  imports: [
    PrismaModule,
    FileModule,
    MailModule,
    SeedModule,
    UtilsModule,
    QueueModule,
    PrivateMessageModule,
  ],
  exports: [],
  providers: [],
})
export class LibModule {}
