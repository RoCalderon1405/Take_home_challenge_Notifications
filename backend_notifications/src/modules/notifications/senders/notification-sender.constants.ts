/**
 * Dependency injection token used to provide the collection of
 * notification sender strategies to the registry.
 *
 * A Symbol is used to avoid collisions with other providers that could
 * accidentally use the same string token.
 */
export const NOTIFICATION_SENDER_STRATEGIES = Symbol(
  'NOTIFICATION_SENDER_STRATEGIES',
);
