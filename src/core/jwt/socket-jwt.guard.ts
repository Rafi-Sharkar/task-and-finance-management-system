import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Injectable()
export class SocketJwtGuard implements CanActivate {
  private readonly logger = new Logger(SocketJwtGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    try {
      const authHeader =
        client.handshake.headers.authorization || client.handshake.auth?.token;

      if (!authHeader) {
        throw new UnauthorizedException('Missing authorization header');
      }

      // Extract token - handle both "Bearer token" and "token" formats
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;

      if (!token) {
        throw new UnauthorizedException('Missing token');
      }

      // Verify JWT token
      const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
      const payload: any = jwt.verify(token, jwtSecret as string);
      const userId = payload.sub;

      // Verify user exists in database
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found in database');
      }

      // Attach user data to socket for later use
      client.data.userId = userId;
      client.data.user = user;

      this.logger.log(
        `Socket JWT authentication successful for user: ${userId}`,
      );
      return true;
    } catch (error) {
      this.logger.warn(`Socket JWT authentication failed: ${error.message}`);
      throw new UnauthorizedException(error.message || 'Invalid token');
    }
  }
}
