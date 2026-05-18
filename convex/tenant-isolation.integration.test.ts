import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/trainer/sessions/route';

// Mock auth and Convex functions
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/convex', () => ({
  createTrainingSession: jest.fn(),
  getOrgTrainerObjectionConfig: jest.fn(),
  getTraineeProfileById: jest.fn(),
}));

jest.mock('@/lib/assigned-sessions', () => ({
  buildExpectedRebuttalsFromAssigned: jest.fn(),
  buildRebuttalGuideMapForAssigned: jest.fn(),
  normalizeAssignedObjections: jest.fn(),
}));

jest.mock('@/lib/training-products', () => ({
  getTrainingProductConfig: jest.fn(),
  isProductDifficultyAllowed: jest.fn(),
  isTrainingProductType: jest.fn(),
  normalizeTrainingProductType: jest.fn(),
}));

jest.mock('@/lib/vapi-assistants', () => ({
  resolveTrainingAssistantId: jest.fn(),
}));

jest.mock('@/lib/trainer-objections', () => ({
  DEFAULT_OBJECTION_LIBRARY: {},
  DEFAULT_REBUTTAL_GUIDES: {},
  getDefaultObjectionLibraryForProduct: jest.fn(),
  getDefaultRebuttalGuidesForProduct: jest.fn(),
}));

describe('Tenant Isolation - Integration Tests', () => {
  let server;

  beforeAll(() => {
    server = createServer();
  });

  afterAll(() => {
    server.close();
  });

  it('should reject request without orgId', async () => {
    const { auth } = require('@clerk/nextjs/server');
    auth.mockResolvedValue({ userId: 'user123', orgId: null });

    const request = new NextRequest('http://localhost:3000/api/trainer/sessions', {
      method: 'POST',
      body: JSON.stringify({ traineeId: 'trainee1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Choose a team before assigning sessions.');
  });

  it('should reject cross-org trainee access', async () => {
    const { auth } = require('@clerk/nextjs/server');
    const { getTraineeProfileById } = require('@/lib/convex');

    auth.mockResolvedValue({ userId: 'user123', orgId: 'orgA' });
    getTraineeProfileById.mockResolvedValue(null); // Simulate trainee not found in orgA

    const request = new NextRequest('http://localhost:3000/api/trainer/sessions', {
      method: 'POST',
      body: JSON.stringify({ traineeId: 'traineeFromOrgB' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Trainee not found.');
  });

  it('should allow same-org trainee access', async () => {
    const { auth } = require('@clerk/nextjs/server');
    const { getTraineeProfileById } = require('@/lib/convex');
    const { getTrainingProductConfig, isProductDifficultyAllowed, normalizeTrainingProductType } = require('@/lib/training-products');
    const { buildExpectedRebuttalsFromAssigned, buildRebuttalGuideMapForAssigned, normalizeAssignedObjections } = require('@/lib/assigned-sessions');
    const { resolveTrainingAssistantId } = require('@/lib/vapi-assistants');
    const { createTrainingSession } = require('@/lib/convex');
    const { getOrgTrainerObjectionConfig } = require('@/lib/convex');
    const { getDefaultObjectionLibraryForProduct, getDefaultRebuttalGuidesForProduct } = require('@/lib/trainer-objections');

    auth.mockResolvedValue({ userId: 'user123', orgId: 'orgA' });
    getTraineeProfileById.mockResolvedValue({
      traineeId: 'trainee1',
      orgId: 'orgA',
      clerkUserId: 'clerk123',
      name: 'Trainee One',
      availableProductTypes: ['life'],
      difficultyLevel: 'D2',
    });

    // Mock product config and validation
    const { isTrainingProductType } = require('@/lib/training-products');
    isTrainingProductType.mockReturnValue(true); // Mock to return true for valid product type
    normalizeTrainingProductType.mockReturnValue('life');
    getTrainingProductConfig.mockReturnValue({ productLabel: 'Life Insurance' });
    isProductDifficultyAllowed.mockReturnValue(true);

    // Mock assigned sessions helpers
    const mockObjections = [{ text: 'test objection', rebuttalType: 'test_rebuttal' }];
    normalizeAssignedObjections.mockReturnValue(mockObjections);
    buildExpectedRebuttalsFromAssigned.mockReturnValue(['test_rebuttal']);
    buildRebuttalGuideMapForAssigned.mockReturnValue({ 'test_rebuttal': 'guide text' });

    // Mock VAPI assistant
    resolveTrainingAssistantId.mockReturnValue('assistant123');

    // Mock objection config
    getOrgTrainerObjectionConfig.mockResolvedValue(null);
    
    // Mock DEFAULT_OBJECTION_LIBRARY since it's used as fallback
    const { DEFAULT_OBJECTION_LIBRARY } = require('@/lib/trainer-objections');
    DEFAULT_OBJECTION_LIBRARY.D2 = [{ text: 'test objection', rebuttalType: 'test_rebuttal', frequency: 'common' }];
    
    getDefaultRebuttalGuidesForProduct.mockReturnValue({});

    // Mock session creation
    createTrainingSession.mockResolvedValue({
      sessionKey: 'sess123',
      orgId: 'orgA',
      trainerId: 'user123',
      traineeId: 'trainee1',
    });

    const request = new NextRequest('http://localhost:3000/api/trainer/sessions', {
      method: 'POST',
      body: JSON.stringify({ 
        traineeId: 'trainee1', 
        productType: 'life', 
        difficulty: 'D2',
        selectedObjections: [{ text: 'test objection', rebuttalType: 'test_rebuttal' }]
      }),
    });

    const response = await POST(request);
    const data = await response.json();
    console.log('Response:', response.status, data); // Debug log

    expect(response.status).toBe(200);
  });
});