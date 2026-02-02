import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

/**
 * Validation service for request DTOs
 */
@Injectable()
export class ValidationService {
  /**
   * Validate and transform request data using class-validator
   * @param type - The DTO class type
   * @param plainObject - The plain object to validate
   * @returns Promise<T> - The validated and transformed instance
   */
  async validate<T>(type: new () => T, plainObject: any): Promise<T> {
    const instance = plainToInstance(type, plainObject, {
      excludeExtraneousValues: true,
    });

    const errors = await validate(instance as object, {
      stopAtFirstError: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = this.formatValidationErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return instance;
  }

  /**
   * Format validation errors into readable messages
   */
  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      if (error.property) {
        formatted[error.property] = Object.values(error.constraints || {});
      }
    });

    return formatted;
  }
}
