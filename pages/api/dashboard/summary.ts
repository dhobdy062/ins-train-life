import type { NextApiRequest, NextApiResponse } from 'next';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Get dashboard summary data from Convex
    const dashboardData = await convex.query(api.dashboard.getDashboardSummary, {
      teamId: teamId as any
    });

    if (!dashboardData) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}