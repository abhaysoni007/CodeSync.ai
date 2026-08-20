import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProjectCallToken } from '../controllers/CallSessionController.js';
import Project from '../models/Project.js';
import { AccessToken } from 'livekit-server-sdk';

vi.mock('../models/Project.js');
vi.mock('livekit-server-sdk', () => {
  const mockAccessTokenInstance = {
    addGrant: vi.fn(),
    toJwt: vi.fn().mockResolvedValue('mocked-jwt-token')
  };
  return {
    AccessToken: vi.fn().mockImplementation(function() { return mockAccessTokenInstance; })
  };
});

describe('CallSessionController - createProjectCallToken', () => {
  let mockReq;
  let mockRes;
  let envCache;

  beforeEach(() => {
    envCache = process.env;
    process.env = { ...envCache };

    mockReq = {
      params: { id: 'proj-123' },
      user: { id: 'user-1', username: 'testuser' }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    // Clear mock calls
    AccessToken.mockClear();
    AccessToken().addGrant.mockClear();
    AccessToken().toJwt.mockClear();
  });

  afterEach(() => {
    process.env = envCache;
    vi.clearAllMocks();
  });

  it('fails safely if LiveKit config is missing', async () => {
    delete process.env.LIVEKIT_API_KEY;
    
    Project.findById.mockResolvedValue({
      _id: 'proj-123',
      ownerId: { toString: () => 'user-1' },
      members: []
    });

    await createProjectCallToken(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'LiveKit configuration is missing on the server'
    }));
  });

  it('returns 404 if project is missing', async () => {
    Project.findById.mockResolvedValue(null);

    await createProjectCallToken(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 if user is not a member', async () => {
    Project.findById.mockResolvedValue({
      _id: 'proj-123',
      ownerId: { toString: () => 'user-2' },
      members: [
        { userId: { toString: () => 'user-3' } }
      ]
    });

    await createProjectCallToken(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('returns token and url for authorized member', async () => {
    process.env.LIVEKIT_API_KEY = 'test-key';
    process.env.LIVEKIT_API_SECRET = 'test-secret';
    process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';

    Project.findById.mockResolvedValue({
      _id: 'proj-123',
      ownerId: { toString: () => 'user-2' },
      members: [
        { userId: { toString: () => 'user-1' } }
      ]
    });

    await createProjectCallToken(mockReq, mockRes);

    expect(AccessToken).toHaveBeenCalledWith('test-key', 'test-secret', {
      identity: 'user-1',
      name: 'testuser',
      ttl: '4h'
    });

    const mockAccessTokenInstance = new AccessToken();
    expect(mockAccessTokenInstance.addGrant).toHaveBeenCalledWith({
      roomJoin: true,
      room: 'codesync-project-proj-123',
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        token: 'mocked-jwt-token',
        url: 'wss://test.livekit.cloud'
      }
    });

    // Verify secret is NOT exposed
    const responsePayload = mockRes.json.mock.calls[0][0];
    expect(responsePayload.data.secret).toBeUndefined();
    expect(JSON.stringify(responsePayload)).not.toContain('test-secret');
  });
});
