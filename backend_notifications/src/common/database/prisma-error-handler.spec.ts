import { ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma } from '@app/generated/prisma/client';
import { PrismaErrorCode, PrismaErrorHandler } from '.';

describe('PrismaErrorHandler', () => {
  /**
   * Creates a Prisma known request error for unit testing without
   * requiring a real database operation.
   */
  const createPrismaError = (
    code: string,
  ): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('Prisma operation failed', {
      code,
      clientVersion: '7.9.0',
    });

  it('should throw the mapped application error for a known Prisma code', () => {
    const error = createPrismaError(PrismaErrorCode.RECORD_NOT_FOUND);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.RECORD_NOT_FOUND]: () =>
          new NotFoundException('User not found'),
      }),
    ).toThrow(NotFoundException);
  });

  it('should support different application errors for different Prisma codes', () => {
    const error = createPrismaError(PrismaErrorCode.UNIQUE_CONSTRAINT);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.UNIQUE_CONSTRAINT]: () =>
          new ConflictException('Resource already exists'),
      }),
    ).toThrow(ConflictException);
  });

  it('should rethrow a known Prisma error when no handler is configured', () => {
    const error = createPrismaError(PrismaErrorCode.RECORD_NOT_FOUND);

    expect(() => PrismaErrorHandler.handle(error, {})).toThrow(error);
  });

  it('should rethrow errors that are not known Prisma request errors', () => {
    const error = new Error('Database connection failed');

    expect(() =>
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.RECORD_NOT_FOUND]: () => new NotFoundException(),
      }),
    ).toThrow(error);
  });
});
