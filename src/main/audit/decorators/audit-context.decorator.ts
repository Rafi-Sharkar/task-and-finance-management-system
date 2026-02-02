import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Decorator to extract audit context (IP address and user agent) from the request
 */
export const GetAuditContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditContext => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return {
      ipAddress: request.ip || request.socket.remoteAddress || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };
  },
);
