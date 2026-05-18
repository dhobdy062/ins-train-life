import { describe, it, expect, jest } from '@jest/globals';

jest.mock('./webhooks', () => ({
  ...jest.requireActual('./webhooks'),
  persistVapiEvent: jest.fn(() => { throw new Error('Processing failed'); }),
}));

import { processWebhookEvent } from './webhooks';

// Mock dependencies
jest.mock('./_generated/server', () => ({
  internalMutation: jest.fn((fn) => fn),
  mutation: jest.fn((fn) => fn),
  internalQuery: jest.fn((fn) => fn),
  query: jest.fn((fn) => fn),
}));

describe('Reliability - Retry Logic', () => {
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

  it('should retry a failed webhook event and increment the attemptCount', async () => {
    const webhookRecord = {
      _id: 'evt_1',
      provider: 'vapi',
      payload: {},
      status: 'queued',
      attemptCount: 1,
      maxAttempts: 3,
    };

    mockDb.get.mockResolvedValue(webhookRecord);

    await processWebhookEvent.handler({ db: mockDb, scheduler: mockScheduler }, { eventId: 'evt_1' });

    // Check that the event was patched with an incremented attempt count and new status
    expect(mockDb.patch).toHaveBeenCalledWith('evt_1', {
      status: 'failed',
      processedAt: expect.any(Number),
      error: 'Processing failed',
      attemptCount: 2,
    });

    // Check that the job was rescheduled
    expect(mockScheduler.runAfter).toHaveBeenCalledWith(
      expect.any(Number), // Check for backoff delay
      expect.any(Function), // Check for the processWebhookEvent function
      { eventId: 'evt_1' }
    );
  });
});