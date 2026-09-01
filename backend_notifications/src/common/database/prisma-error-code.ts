/**
 * Prisma known request error codes handled by the application.
 *
 * Centralizing these values prevents persistence-layer error codes
 * from being duplicated as magic strings throughout the codebase.
 */
export const PrismaErrorCode = {
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
} as const;

export type PrismaErrorCode =
  (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];
