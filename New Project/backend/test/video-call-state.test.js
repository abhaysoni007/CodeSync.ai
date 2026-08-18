import { describe, it, expect, vi, beforeEach } from 'vitest';
import setupYjsHandlers from '../services/SocketHandlers.js';

describe('Video Call State Management', () => {
  let io;
  let mockSocket;
  let emitMock;
  let toMock;
  let broadcastEmitMock;

  beforeEach(() => {
    emitMock = vi.fn();
    broadcastEmitMock = vi.fn();
    
    toMock = vi.fn().mockReturnValue({
      emit: broadcastEmitMock
    });

    mockSocket = {
      id: 'socket1',
      userId: 'user1',
      username: 'User One',
      currentProject: 'proj1',
      emit: emitMock,
      to: toMock,
      on: vi.fn(),
      handshake: { auth: { token: 'mock-token' } }
    };

    io = {
      use: vi.fn((fn) => {
        // mock auth middleware
      }),
      on: vi.fn((event, cb) => {
        if (event === 'connection') {
          // Instead of calling cb(mockSocket) immediately, we'll extract the handlers
        }
      }),
      to: toMock
    };
  });

  it('should register video events', () => {
    // This is a basic structural test. 
    // Since the actual state is locked inside the module scope,
    // mocking the socket connection and calling handlers directly is needed.
    setupYjsHandlers(io);
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  // Since projectCalls is a module-level variable inside SocketHandlers,
  // we simulate a connection to test the event handlers.
  it('handles call lifecycle', async () => {
    setupYjsHandlers(io);
    const connectionHandler = io.on.mock.calls.find(call => call[0] === 'connection')[1];
    
    connectionHandler(mockSocket);

    const getHandler = (eventName) => mockSocket.on.mock.calls.find(call => call[0] === eventName)?.[1];
    
    const startHandler = getHandler('video:call-start');
    const stateRequestHandler = getHandler('video:call-state-request');
    const joinHandler = getHandler('video:call-join');
    const leaveHandler = getHandler('video:call-leave');

    expect(startHandler).toBeDefined();
    expect(stateRequestHandler).toBeDefined();

    // Test 1: Start call
    startHandler({ projectId: 'proj1' });
    
    expect(toMock).toHaveBeenCalledWith('project:proj1');
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-state', {
      active: true,
      participants: [{ userId: 'user1', username: 'User One' }]
    });
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-started', {
      userId: 'user1',
      username: 'User One'
    });

    // Test 2: Another user joins
    const mockSocket2 = {
      id: 'socket2',
      userId: 'user2',
      username: 'User Two',
      currentProject: 'proj1',
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      on: vi.fn()
    };
    connectionHandler(mockSocket2);
    const joinHandler2 = mockSocket2.on.mock.calls.find(call => call[0] === 'video:call-join')[1];
    
    broadcastEmitMock.mockClear();
    joinHandler2({ projectId: 'proj1' });
    
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-state', {
      active: true,
      participants: [
        { userId: 'user1', username: 'User One' },
        { userId: 'user2', username: 'User Two' }
      ]
    });

    // Test 3: First user leaves
    broadcastEmitMock.mockClear();
    leaveHandler({ projectId: 'proj1' });
    
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-state', {
      active: true,
      participants: [{ userId: 'user2', username: 'User Two' }]
    });

    // Test 4: Last user leaves
    const leaveHandler2 = mockSocket2.on.mock.calls.find(call => call[0] === 'video:call-leave')[1];
    broadcastEmitMock.mockClear();
    leaveHandler2({ projectId: 'proj1' });
    
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-ended', {
      userId: 'user2',
      username: 'User Two'
    });
    expect(broadcastEmitMock).toHaveBeenCalledWith('video:call-state', {
      active: false,
      participants: []
    });
  });
});
