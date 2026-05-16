import { describe, it, expect, jest } from '@jest/globals';
import { processWebhookEvent } from './webhooks';

// Mock dependencies
jest.mock('./_generated/server', () => ({
  internalMutation: jest.fn((fn) => fn),
  mutation: jest.fn((fn) => fn),
  internalQuery: jest.fn((fn) => fn),
  query: jest.fn((fn) => fn),
}));

jest.mock('./webhooks', () => ({
  ...jest.requireActual('./webhooks'),
  persistVapiEvent: jest.fn(),
}));

describe('Chaos Engineering - Database Outage', () => {
  const mockDb = {
    get: jest.fn(),
    patch: jest.fn(),
    insert: jest.fn(),
    query: jest.fn().mockReturnThis(),
    withIndex: jest.fn().mockReturnThis(),
    first: jest.fn(),
  };

  const mockScheduler = {
    runAfter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a database outage gracefully and recover when the database is available again', async () => {
    const webhookRecord = {
      _id: 'evt_1',
      provider: 'vapi',
      payload: {},
      status: 'queued',
      attemptCount: 1,
      maxAttempts: 3,
    };

    // Simulate a database outage
    mockDb.get.mockRejectedValue(new Error('Database is unavailable'));

    try {
      await processWebhookEvent.handler({ db: mockDb, scheduler: mockScheduler }, { eventId: 'evt_1' });
    } catch (error) {
      // The error is expected, so we can ignore it
    }

    // Check that the event was patched with an incremented attempt count and new status
    expect(mockDb.patch).toHaveBeenCalledWith('evt_1', {
      status: 'failed',
      processedAt: expect.any(Number),
      error: 'Database is unavailable',
      attemptCount: 2,
    });

    // Check that the job was rescheduled
    expect(mockScheduler.runAfter).toHaveBeenCalledWith(
      expect.any(Number), // Check for backoff delay
      expect.any(Function), // Check for the processWebhookEvent function
      { eventId: 'evt_1' }
    );

    // Simulate the database being available again
    mockDb.get.mockResolvedValue(webhookRecord);
    mockDb.patch.mockClear();
    mockScheduler.runAfter.mockClear();

    await processWebhookEvent.handler({ db: mockDb, scheduler: mockScheduler }, { eventId: 'evt_1' });

    // Check that the event was processed successfully
    expect(mockDb.patch).toHaveBeenCalledWith('evt_1', {
      status: 'processed',
      processedAt: expect.any(Number),
    });
  });
});