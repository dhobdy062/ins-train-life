import { describe, it, expect, jest } from '@jest/globals';
import { getClient } from '@/lib/convex';
import { api } from './_generated/api';

const convex = getClient();

describe('Concurrency Handling - Integration Test', () => {
  it('should handle concurrent webhook processing for the same session gracefully', async () => {
    const sessionKey = `concurrent_session_${Date.now()}`;
    const webhookPayload1 = { id: 'evt_1', call: { metadata: { sessionKey }, durationSeconds: 60 }, message: { type: 'end-of-call-report' } };
    const webhookPayload2 = { id: 'evt_2', call: { metadata: { sessionKey }, durationSeconds: 120 }, message: { type: 'end-of-call-report' } };

    // Enqueue two webhooks for the same session
    await Promise.all([
      convex.mutation(api.webhooks.enqueueWebhookEvent, {
        provider: 'vapi',
        idempotencyKey: `key_${Date.now()}_1`,
        payload: webhookPayload1,
        receivedAt: Date.now(),
      }),
      convex.mutation(api.webhooks.enqueueWebhookEvent, {
        provider: 'vapi',
        idempotencyKey: `key_${Date.now()}_2`,
        payload: webhookPayload2,
        receivedAt: Date.now(),
      }),
    ]);

    // Wait for the webhooks to be processed
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check the final state of the session
    const session = await convex.query(api.sessions.getTrainingSessionBySessionKey, { sessionKey });
    expect(session).not.toBeNull();
    expect(session?.structuredOutcome?.callSummary).toBeDefined();
  }, 30000); // Increase timeout for integration test
});