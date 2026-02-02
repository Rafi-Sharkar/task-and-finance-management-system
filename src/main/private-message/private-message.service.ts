import { successResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';

@Injectable()
export class PrivateChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a private message and update lastMessage in conversation
   */
  @HandleError('Failed to send private message', 'PRIVATE_CHAT')
  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: SendPrivateMessageDto,
  ) {
    const message = await this.prisma.client.privateMessage.create({
      data: {
        content: dto.content,
        conversationId,
        senderId,
        ...(dto.files &&
          dto.files.length > 0 && {
            files: dto.files,
          }),
      },
      include: {
        sender: {
          select: {
            id: true,
            avatarUrl: true,
            fullName: true,
          },
        },
      },
    });

    // Update last message reference in conversation
    await this.prisma.client.privateConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    });

    // Fetch conversation to set delivery status
    const conversation =
      await this.prisma.client.privateConversation.findUnique({
        where: { id: conversationId },
      });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    await this.prisma.client.privateMessageStatus.createMany({
      data: [
        {
          messageId: message.id,
          userId: conversation.user1Id,
          status: 'DELIVERED',
        },
        {
          messageId: message.id,
          userId: conversation.user2Id,
          status: 'DELIVERED',
        },
      ],
      skipDuplicates: true,
    });

    return message;
  }

  /**
   *-------------------- Load all chats ----------------------
   */
  @HandleError('Failed to get all chats with last message')
  async getAllChatsWithLastMessage(userId: string) {
    // ---------- Private chats -----------------
    const privateChats = await this.prisma.client.privateConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        id: true,
        user1Id: true,
        updatedAt: true,
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                avatarUrl: true,
                fullName: true,
              },
            },
          },
        },
        user1: {
          select: {
            id: true,
            avatarUrl: true,
            fullName: true,
          },
        },
        user2: {
          select: {
            id: true,
            avatarUrl: true,
            fullName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedPrivateChats = privateChats.map((chat: any) => {
      const otherUser = chat.user1Id === userId ? chat.user2 : chat.user1;
      return {
        type: 'private',
        chatId: chat.id,
        participant: otherUser,
        lastMessage: chat.lastMessage
          ? {
              id: chat.lastMessage.id,
              content: chat.lastMessage.content,
              createdAt: chat.lastMessage.createdAt,
              sender: chat.lastMessage.sender,
              file: chat.lastMessage.file,
            }
          : null,
        updatedAt: chat.updatedAt,
      };
    });

    // ------------ Merge & sort-------------------
    const allChats = [...formattedPrivateChats].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    return successResponse(allChats, 'Chats fetched successfully');
  }

  /**
   * Find existing conversation between two users or create one
   */
  @HandleError('Failed to find conversation', 'PRIVATE_CHAT')
  async findConversation(userA: string, userB: string) {
    if (!userA || !userB) {
      throw new Error(
        `Invalid user IDs for findConversation: userA=${userA}, userB=${userB}`,
      );
    }
    const [user1Id, user2Id] = [userA, userB].sort();
    return this.prisma.client.privateConversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
    });
  }

  /**
   * Create new conversation between two users
   */
  @HandleError('Failed to create conversation', 'PRIVATE_CHAT')
  async createConversation(userA: string, userB: string) {
    const [user1Id, user2Id] = [userA, userB].sort();
    return this.prisma.client.privateConversation.create({
      data: { user1Id, user2Id },
    });
  }

  /**
   * Validate user exists in database
   */
  @HandleError('Failed to validate user', 'PRIVATE_CHAT')
  async validateUserExists(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Find existing conversation between two users or create one
   */
  @HandleError('Failed to find or create conversation', 'PRIVATE_CHAT')
  async findOrCreateConversation(userA: string, userB: string) {
    // Validate both users exist
    const [userAExists, userBExists] = await Promise.all([
      this.validateUserExists(userA),
      this.validateUserExists(userB),
    ]);

    if (!userAExists) {
      throw new NotFoundException(`User ${userA} not found`);
    }
    if (!userBExists) {
      throw new NotFoundException(`Recipient user not found`);
    }

    let conversation = await this.findConversation(userA, userB);
    if (!conversation) {
      conversation = await this.createConversation(userA, userB);
    }
    return conversation;
  }

  @HandleError("Error getting user's conversations", 'PRIVATE_CHAT')
  async getUserNewConversations(userId: string) {
    return await this.prisma.client.privateConversation.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                avatarUrl: true,
                fullName: true,
              },
            },
            // file: true,
          },
        },
        user1: {
          select: {
            id: true,
            avatarUrl: true,
            fullName: true,
          },
        },
        user2: {
          select: {
            id: true,
            avatarUrl: true,
            fullName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get all conversations for a user
   */
  @HandleError("Error getting user's conversations", 'PRIVATE_CHAT')
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.client.privateConversation.findMany(
      {
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          lastMessage: {
            include: {
              sender: {
                select: {
                  id: true,
                  avatarUrl: true,
                  fullName: true,
                  email: true,
                  username: true,
                },
              },
            },
          },
          user1: {
            select: {
              id: true,
              avatarUrl: true,
              fullName: true,
              email: true,
              username: true,
            },
          },
          user2: {
            select: {
              id: true,
              avatarUrl: true,
              fullName: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    );

    return conversations.map((chat: any) => {
      const otherUser = chat.user1Id === userId ? chat.user2 : chat.user1;
      return {
        type: 'private',
        chatId: chat.id,
        participant: otherUser,
        lastMessage: chat.lastMessage || null,
        updatedAt: chat.updatedAt,
        isRead: chat.lastMessage?.isRead || false,
      };
    });
  }

  /**
   * Get all messages for a conversation
   */
  @HandleError("Conversation doesn't exist", 'PRIVATE_CHAT')
  async getConversationMessages(conversationId: string) {
    return this.prisma.client.privateMessage.findMany({
      where: { conversationId },
      include: {
        sender: true,
        // file: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a conversation with messages (validate access)
   */
  @HandleError("Conversation doesn't exist", 'PRIVATE_CHAT')
  async getPrivateConversationWithMessages(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.client.privateConversation.findFirst(
      {
        where: {
          id: conversationId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: {
            select: {
              id: true,
              avatarUrl: true,
              fullName: true,
              username: true,
              email: true,
            },
          },
          user2: {
            select: {
              id: true,
              avatarUrl: true,
              fullName: true,
              username: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  avatarUrl: true,
                  fullName: true,
                  username: true,
                  email: true,
                },
              },
              // file: true,
            },
          },
        },
      },
    );

    if (!conversation) {
      throw new AppError(404, `Conversation not found or access denied`);
    }

    return successResponse(
      {
        conversationId: conversation.id,
        participants: [conversation.user1, conversation.user2],
        messages: conversation.messages,
      },
      'Conversation loaded successfully',
    );
  }

  /**
   * Mark a message as read
   */
  @HandleError('Failed to mark message as read', 'PRIVATE_CHAT')
  async makePrivateMassageReadTrue(id: string) {
    return this.prisma.client.privateMessage.updateMany({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Delete a conversation
   */
  @HandleError('Failed to delete conversation', 'PRIVATE_CHAT')
  async deleteConversation(conversationId: string) {
    return this.prisma.client.privateConversation.deleteMany({
      where: { id: conversationId },
    });
  }
}
