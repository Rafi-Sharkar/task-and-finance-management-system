import { Injectable } from '@nestjs/common';

// Stub service - FileModule is disabled
@Injectable()
export class MulterService {
  createMulterOptions(): any {
    return {};
  }

  createMultipleFileOptions(): any {
    return {};
  }
}
