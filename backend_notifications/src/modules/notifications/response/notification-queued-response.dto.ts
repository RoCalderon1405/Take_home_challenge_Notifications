/**
 * Response returned when a notification has been accepted
 * for asynchronous processing.
 */
export class NotificationQueuedResponseDto {
  status!: 'QUEUED';

  jobId?: string;
}
