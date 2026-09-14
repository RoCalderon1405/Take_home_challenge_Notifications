export class ApiError extends Error {
  readonly status: number | null;
  readonly details?: unknown;

  constructor(message: string, status: number | null, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
