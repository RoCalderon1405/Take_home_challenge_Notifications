import { describe, expect, it } from 'vitest';

import { notificationMapper } from './notification.mapper';

const dto = {
  id: 'notification-1',
  channel: 'EMAIL' as const,
  title: 'Hello',
  content: 'Body',
  recipient: 'user@example.com',
  status: 'DELIVERED' as const,
  lastError: null,
  sentAt: '2026-09-12T10:00:00.000Z',
  deliveredAt: '2026-09-12T10:00:01.000Z',
  createdAt: '2026-09-12T09:59:00.000Z',
  updatedAt: '2026-09-12T10:00:01.000Z',
};

describe('notificationMapper', () => {
  it('maps API date strings to Date instances', () => {
    const model = notificationMapper.toModel(dto);

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.sentAt).toBeInstanceOf(Date);
    expect(model.deliveredAt).toBeInstanceOf(Date);
    expect(model.title).toBe('Hello');
  });
});
