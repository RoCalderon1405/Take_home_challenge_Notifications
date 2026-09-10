/**
 * Represents a failure produced while communicating with an
 * external notification provider.
 *
 * The error keeps provider-specific information out of the
 * notification orchestration layer while exposing whether the
 * operation can safely be retried by the queue.
 */
export class NotificationProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly retryable: boolean,
    public readonly providerCode?: string | number,
  ) {
    super(message);

    this.name = NotificationProviderError.name;
  }
}
