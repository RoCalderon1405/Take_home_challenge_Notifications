import { Prisma } from '@app/generated/prisma/client';

import { PrismaErrorCode } from './prisma-error-code';

type PrismaErrorHandlers = Partial<Record<PrismaErrorCode, () => Error>>;

/**
 * Translates known Prisma persistence errors into application-level errors.
 *
 * Services define the semantic meaning of each Prisma error while this
 * handler centralizes Prisma-specific error detection and dispatching.
 */
export class PrismaErrorHandler {
  /**
   * Throws the mapped application error when a known Prisma error matches.
   *
   * Unrecognized errors are rethrown unchanged so unexpected infrastructure
   * failures are never silently converted into misleading HTTP errors.
   *
   * @param error Original error thrown by Prisma.
   * @param handlers Mapping between Prisma error codes and application errors.
   */
  static handle(error: unknown, handlers: PrismaErrorHandlers): never {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      throw error;
    }

    const handler = handlers[error.code as PrismaErrorCode];

    if (!handler) {
      throw error;
    }

    throw handler();
  }
}
