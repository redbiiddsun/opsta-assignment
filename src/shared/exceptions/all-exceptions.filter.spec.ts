import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ApplicationError } from './application.error';
import { ApplicationErrorKind } from './enums/application-error-kind.enum';

class EmailTakenError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Conflict;
}

const createHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('Given an ApplicationError, when caught, then its kind maps to the HTTP status', () => {
    // Given
    const { host, status, json } = createHost();

    // When
    filter.catch(new EmailTakenError('Email already registered'), host);

    // Then
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'Email already registered',
    });
  });

  it('Given a validation HttpException, when caught, then its message list is kept', () => {
    // Given
    const { host, json } = createHost();
    const validationMessages = ['email must be an email'];

    // When
    filter.catch(new BadRequestException(validationMessages), host);

    // Then
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: validationMessages,
    });
  });

  it('Given an unknown error, when caught, then it responds 500 without leaking details', () => {
    // Given
    const { host, json } = createHost();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // When
    filter.catch(new Error('relation "users" does not exist'), host);

    // Then
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  });
});
