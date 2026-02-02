import { Module } from '@nestjs/common';
import { SocketAuthMiddleware } from 'src/core/jwt/socket-auth.middleware';
import { PrivateChatController } from './private-message.controller';
import { PrivateChatService } from './private-message.service';
import { PrivateChatGateway } from './privateChatGateway';

@Module({
  controllers: [PrivateChatController],
  providers: [PrivateChatService, PrivateChatGateway, SocketAuthMiddleware],
})
export class PrivateMessageModule {}
