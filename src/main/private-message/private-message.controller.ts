import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  OnModuleInit,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { JWTPayload } from '@/core/jwt/jwt.interface';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';
import { sendPrivateMessageSwaggerSchema } from './dto/sendPrivateMessageSwaggerSchema';
import { PrivateChatService } from './private-message.service';
import { PrivateChatGateway } from './privateChatGateway';

@ApiTags('One to One Chat')
@Controller('private-chat')
@ValidateAuth()
@ApiBearerAuth()
export class PrivateChatController implements OnModuleInit {
  private gateway: PrivateChatGateway;

  constructor(
    private readonly privateService: PrivateChatService,
    @Inject(forwardRef(() => PrivateChatGateway))
    private readonly injectedGateway: PrivateChatGateway,
  ) {}

  onModuleInit() {
    this.gateway = this.injectedGateway;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get All Private message: Test_OK' })
  async getAllPrivateMessage(@GetUser() user: JWTPayload) {
    const userId = user.sub;
    return await this.privateService.getAllChatsWithLastMessage(userId);
  }

  // ----------------- get conversation message----------------
  @Get(':conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get messages for a specific private conversation: Test_OK',
  })
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @GetUser() user: JWTPayload,
  ) {
    return await this.privateService.getPrivateConversationWithMessages(
      conversationId,
      user.sub,
    );
  }
  // -----------send message for

  @Post('send-message/:recipientId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sending Private message: Test_OK' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: sendPrivateMessageSwaggerSchema.properties,
    },
  })
  async sendTeamMessage(
    @Param('recipientId') recipientId: string,
    @Body() dto: SendPrivateMessageDto,
    @GetUser() user: JWTPayload,
  ) {
    const senderId = user.sub;
    if (recipientId === senderId) {
      throw new Error('Cannot send message to yourself');
    }

    const conversation = await this.privateService.findOrCreateConversation(
      senderId,
      recipientId,
    );

    const message = await this.privateService.sendPrivateMessage(
      conversation.id,
      senderId,
      dto,
    );

    // Emit to both sender and recipient
    this.gateway.emitNewMessage(senderId, message);
    this.gateway.emitNewMessage(recipientId, message);

    return { success: true, message };
  }

  @Post('make-private-message-read/:messageId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark message as read: Test_OK' })
  async makePrivateMassageReadTrue(@Param('messageId') messageId: string) {
    return await this.privateService.makePrivateMassageReadTrue(messageId);
  }

  @Delete(':conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete conversation' })
  async deleteConversation(@Param('conversationId') conversationId: string) {
    return await this.privateService.deleteConversation(conversationId);
  }

  @Post('create-conversationid/:recipientId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get or create conversation with a recipient' })
  async createConversationId(
    @Param('recipientId') recipientId: string,
    @GetUser() user: JWTPayload,
  ) {
    const senderId = user.sub;

    if (recipientId === senderId) {
      throw new Error('Cannot create conversation with yourself');
    }

    const conversation = await this.privateService.findOrCreateConversation(
      senderId,
      recipientId,
    );

    return {
      success: true,
      conversationId: conversation.id,
      message: 'Conversation retrieved successfully',
    };
  }
}
