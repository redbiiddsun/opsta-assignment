import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ApplicationError } from './application.error';
import { ApplicationErrorKind } from './enums/application-error-kind.enum';
import { ErrorResponse } from './models/error-response';

const STATUS_BY_ERROR_KIND: Record<ApplicationErrorKind, HttpStatus> = {
  [ApplicationErrorKind.Conflict]: HttpStatus.CONFLICT,
  [ApplicationErrorKind.Unauthorized]: HttpStatus.UNAUTHORIZED,
  [ApplicationErrorKind.Forbidden]: HttpStatus.FORBIDDEN,
  [ApplicationErrorKind.NotFound]: HttpStatus.NOT_FOUND,
  [ApplicationErrorKind.Validation]: HttpStatus.BAD_REQUEST,
};

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

type ErrorDetails = Pick<ErrorResponse, 'statusCode' | 'message'>;

const readHttpExceptionMessage = (
  exception: HttpException,
): string | string[] => {
  const body = exception.getResponse();
  if (typeof body === 'object' && 'message' in body) {
    return body.message as string | string[];
  }
  return exception.message;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.toErrorDetails(exception);
    const errorResponse: ErrorResponse = {
      statusCode,
      error: STATUS_CODES[statusCode] ?? INTERNAL_ERROR_MESSAGE,
      message,
    };

    response.status(statusCode).json(errorResponse);
  }

  private toErrorDetails(exception: unknown): ErrorDetails {
    if (exception instanceof ApplicationError) {
      return {
        statusCode: STATUS_BY_ERROR_KIND[exception.kind],
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        message: readHttpExceptionMessage(exception),
      };
    }

    // Unknown errors may carry SQL or internals: log server-side, return a generic body.
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}
