import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

type ErrorSpec = {
  status: number;
  message: string;
  exampleData?: any;
  description?: string;
};

type ResponseTypeCheckerOptions = {
  model: Type<any>;
  successStatus?: number; // default 200
  successMessage?: string; // default 'Request Success'
  successExampleData?: any; // example for data
  description?: string;
  errors?: ErrorSpec[];
};

export function ApiResponseTypeChecker(options: ResponseTypeCheckerOptions) {
  const {
    model,
    successStatus = 200,
    successMessage = 'Request Success',
    successExampleData,
    description,
    errors = [],
  } = options;

  const successDecorator = ApiResponse({
    status: successStatus,
    description: description ?? successMessage,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: successMessage },
        data: { $ref: getSchemaPath(model) },
      },
      example: {
        success: true,
        message: successMessage,
        data: successExampleData ?? {},
      },
    },
  });

  const errorDecorators = errors.map((err) =>
    ApiResponse({
      status: err.status,
      description: err.description ?? err.message,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: err.message },
          data: {
            type: 'object',
            nullable: true,
            example: err.exampleData ?? null,
          },
        },
        example: {
          success: false,
          message: err.message,
          data: err.exampleData ?? null,
        },
      },
    }),
  );

  return applyDecorators(
    ApiExtraModels(model),
    successDecorator,
    ...errorDecorators,
  );
}
