import { describe, it, expect } from '@jest/globals';
import { enqueueWebhookEvent } from './webhooks'; // Assuming this is the entry point

// Mock Convex context/db
jest.mock('./_generated/server', () => ({
  internalMutation: jest.fn(),
  mutation: jest.fn((fn) => fn),
  query: jest.fn(),
  internalQuery: jest.fn(), // Add this line
}));

jest.mock('./_generated/api', () => ({
  internal: {
    webhooks: {
      processWebhookEvent: jest.fn(),
    },
  },
}));

describe('Report Pipeline - Idempotency and Persistence', () => {
  const mockDb = {
    query: jest.fn().mockReturnThis(),
    withIndex: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
  };

  const mockScheduler = {
    runAfter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enqueue a new webhook event', async () => {
    mockDb.first.mockResolvedValue(null);
    mockDb.insert.mockResolvedValue('newEventId');

    const result = await enqueueWebhookEvent.handler(
      { db: mockDb, scheduler: mockScheduler },
      {
        provider: 'vapi',
        idempotencyKey: 'key1',
        payload: {},
        receivedAt: Date.now(),
      }
    );

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockScheduler.runAfter).toHaveBeenCalled();
    expect(result.deduped).toBe(false);
  });

  it('should deduplicate a webhook event with the same idempotency key', async () => {
    mockDb.first.mockResolvedValue({ _id: 'existingEventId', status: 'processed' });

    const result = await enqueueWebhookEvent.handler(
      { db: mockDb, scheduler: mockScheduler },
      {
        provider: 'vapi',
        idempotencyKey: 'key1',
        payload: {},
        receivedAt: Date.now(),
      }
    );

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(result.deduped).toBe(true);
    expect(result.eventId).toBe('existingEventId');
  });
});