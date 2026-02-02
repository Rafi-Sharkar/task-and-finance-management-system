import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns service health and metadata. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy.',
    schema: {
      example: {
        status: 'ok',
        project: {
          name: 'smartsolutiobs',
          version: '1.0.0',
        },
        environment: 'development',
        timestamp: '2026-01-08T10:30:00.000Z',
      },
    },
  })
  health() {
    return {
      status: 'ok',
      project: {
        name: 'smartsolutiobs',
        version: '1.0.0',
      },

      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
