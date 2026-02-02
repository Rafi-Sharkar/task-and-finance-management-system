import { JWTPayload } from '@/core/jwt/jwt.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { PayloadForSocketClient } from '../interface/socket-client-payload';

@WebSocketGateway({
  origin: '*',
  namespace: '/notificationsnow',
})
@Injectable()
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly clients = new Map<string, Set<Socket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log(
      'Socket.IO server initialized for Notification Gateway',
      server.adapter.name,
    );
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) return client.disconnect(true);

      const payload = this.jwtService.verify<JWTPayload>(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      if (!payload.sub) return client.disconnect(true);

      const user = await this.prisma.client.user.findUnique({
        where: { id: payload.sub },
        include: { notificationToggles: true },
      });

      if (!user) return client.disconnect(true);

      // Ensure the user has a NotificationToggle record
      let toggle = user.notificationToggles[0];
      if (!toggle) {
        // Create a new toggle record for the user
        toggle = await this.prisma.client.notificationToggle.create({
          data: { userId: user.id },
        });
      }

      const payloadForSocketClient: PayloadForSocketClient = {
        sub: user.id,
        email: user.email,
        userUpdates: toggle?.userUpdates || false,
        userRegistration: toggle?.userRegistration || false,
        Finance: toggle?.Finance || false,
        documentApproval: toggle?.DocumentApproval || false,
        projectAssignment: toggle?.ProjectAssignment || false,
      };

      client.data.user = payloadForSocketClient;
      this.subscribeClient(user.id, client);

      this.logger.log(`Client connected: ${user.id}`);
    } catch (err: any) {
      this.logger.warn(`JWT verification failed: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.sub;
    if (userId) {
      this.unsubscribeClient(userId, client);
      this.logger.log(`Client disconnected: ${userId}`);
    } else {
      this.logger.log('Client disconnected: unknown user');
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const authHeader =
      client.handshake.headers.authorization || client.handshake.auth?.token;
    if (!authHeader) return null;
    return authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;
  }

  private subscribeClient(userId: string, client: Socket) {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId)!.add(client);
    this.logger.debug(`Subscribed client to user ${userId}`);
  }

  private unsubscribeClient(userId: string, client: Socket) {
    const set = this.clients.get(userId);
    if (!set) return;

    set.delete(client);
    this.logger.debug(`Unsubscribed client from user ${userId}`);
    if (set.size === 0) this.clients.delete(userId);
  }

  public getClientsForUser(userId: string): Set<Socket> {
    return this.clients.get(userId) || new Set();
  }

  /**
   * Send notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      entityId?: string;
      metadata?: any;
      read: boolean;
      createdAt: Date;
    },
  ) {
    try {
      // Get user's notification toggle settings
      const toggle = await this.prisma.client.notificationToggle.findFirst({
        where: { userId },
      });

      // Check if user has this notification type enabled
      const isEnabled = this.isNotificationEnabled(notification.type, toggle);

      if (!isEnabled) {
        this.logger.debug(
          `Notification type ${notification.type} is disabled for user ${userId}`,
        );
        return;
      }

      // Send to all connected sockets for this user
      const clients = this.getClientsForUser(userId);
      if (clients.size > 0) {
        clients.forEach((client) => {
          client.emit('notification', notification);
        });
        this.logger.log(
          `Sent notification to ${clients.size} socket(s) for user ${userId}`,
        );
      } else {
        this.logger.debug(
          `No active sockets for user ${userId}, notification stored in DB`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending notification to user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Check if notification type is enabled for user
   */
  private isNotificationEnabled(type: string, toggle: any): boolean {
    if (!toggle) return true; // Enable by default if no toggle settings

    const typeToggles: Record<string, boolean> = {
      USER_REGISTRATION: toggle.userRegistration ?? true,
      TASK_ASSIGNMENT: toggle.ProjectAssignment ?? true,
      INVOICE_CREATED: toggle.Finance ?? true,
      DOCUMENT_APPROVAL: toggle.DocumentApproval ?? true,
      PAYMENT: toggle.Finance ?? true,
    };

    return typeToggles[type] ?? true;
  }

  public async notifySingleUser(
    userId: string,
    event: string,
    data: Notification,
  ) {
    const clients = this.getClientsForUser(userId);
    if (clients.size === 0) return;
    clients.forEach((client) => client.emit(event, data));
  }

  public async notifyMultipleUsers(
    userIds: string[],
    event: string,
    data: Notification,
  ) {
    userIds.forEach((userId) => this.notifySingleUser(userId, event, data));
  }

  public async notifyAllUsers(event: string, data: Notification) {
    this.clients.forEach((clients) =>
      clients.forEach((client) => client.emit(event, data)),
    );
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong');
  }
}
