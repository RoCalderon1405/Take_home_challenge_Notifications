import type { NotificationChannelCode } from '../../models';

/**
 * Contains the normalized data required by any notification delivery
 * strategy.
 *
 * This contract is independent from Prisma and external provider SDKs,
 * keeping the delivery layer decoupled from persistence.
 */
export interface NotificationSendInput {
  /**
   * Identifier of the notification being delivered.
   */
  notificationId: string;

  /**
   * Destination understood by the selected channel.
   *
   * Examples:
   * - Email address for EMAIL.
   * - Phone number for SMS.
   * - Device token for PUSH.
   */
  recipient: string;

  /**
   * Notification title or subject.
   */
  title: string;

  /**
   * Notification body content.
   */
  content: string;
}

/**
 * Represents a provider-independent delivery result.
 *
 * Each concrete strategy converts its provider-specific response into
 * this normalized application contract.
 */
export interface NotificationSendResult {
  /**
   * Name of the provider used to deliver the notification.
   */
  provider: string;

  /**
   * Optional identifier assigned by the external provider.
   */
  providerMessageId?: string;

  /**
   * Optional provider-specific metadata preserved for auditing and
   * delivery history.
   */
  providerResponse?: Record<string, unknown>;
}

/**
 * Contract that every notification delivery strategy must implement.
 *
 * The orchestration layer depends on this abstraction instead of
 * concrete Email, SMS or Push implementations.
 */
export interface NotificationSenderStrategy {
  /**
   * Channel handled by this strategy.
   */
  readonly channel: NotificationChannelCode;

  /**
   * Sends a notification through the strategy's delivery channel.
   *
   * @param input Normalized notification information required for delivery.
   * @returns Normalized information returned by the delivery provider.
   */
  send(input: NotificationSendInput): Promise<NotificationSendResult>;
}
