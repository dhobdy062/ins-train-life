import type { NextApiRequest, NextApiResponse } from 'next';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventType, data } = req.body;

    // Validate webhook signature if available
    const signature = req.headers['x-vapi-signature'];
    if (signature && process.env.VAPI_WEBHOOK_SECRET) {
      // TODO: Implement signature validation
      // This would involve verifying the signature against the payload
    }

    // Process the webhook event
    switch (eventType) {
      case 'call_completed':
        await handleCallCompleted(data);
        break;
      
      case 'call_started':
        await handleCallStarted(data);
        break;
      
      case 'call_failed':
        await handleCallFailed(data);
        break;
      
      default:
        console.log(`Unknown event type: ${eventType}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCallCompleted(data: any) {
  const {
    callId,
    agentId,
    teamId,
    score,
    difficultyLevel,
    objection,
    result,
    duration,
    transcript,
    feedback,
    minutesUsed,
    timestamp
  } = data;

  // Validate required fields
  if (!callId || !agentId || !teamId || score === undefined) {
    throw new Error('Missing required fields in call_completed event');
  }

  // Process the completed call through Convex
  await convex.mutation(api.mutations.processVapiWebhook, {
    eventType: 'call_completed',
    data: {
      callId,
      agentId,
      teamId,
      score: Math.round(score),
      difficultyLevel: difficultyLevel || 'D1',
      objection: objection || null,
      result: result || 'completed',
      duration: duration || 0,
      transcript: transcript || null,
      feedback: feedback || null,
      minutesUsed: minutesUsed || 0,
    }
  });

  console.log(`Call ${callId} processed successfully for agent ${agentId}`);
}

async function handleCallStarted(data: any) {
  const { callId, agentId, teamId, timestamp } = data;
  
  // Log call start event
  console.log(`Call ${callId} started for agent ${agentId} in team ${teamId}`);
  
  // Optionally create a call record with initial status
  // This could be useful for tracking in-progress calls
}

async function handleCallFailed(data: any) {
  const { callId, agentId, teamId, error, timestamp } = data;
  
  console.error(`Call ${callId} failed for agent ${agentId}:`, error);
  
  // Create a failed call record
  await convex.mutation(api.mutations.createOrUpdateCall, {
    agentId,
    teamId,
    callDate: Date.now(),
    score: 0,
    difficultyLevel: 'D1',
    result: 'failed',
    duration: 0,
    transcript: `Call failed: ${error}`,
    feedback: error,
  });
}