import { AccessToken } from 'livekit-server-sdk';
import CallSession from '../models/CallSession.js';
import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';

/**
 * Generate LiveKit access token for video call
 */
export const createCallToken = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const username = req.user.username;

    // Verify room exists and user has access
    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a member
    const member = await RoomMember.findOne({
      roomId,
      userId,
      isActive: true
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to join this room'
      });
    }

    // LiveKit configuration
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: username,
      ttl: '4h' // Token valid for 4 hours
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    // Create or update call session
    let callSession = await CallSession.findOne({
      roomId,
      status: 'active'
    });

    if (!callSession) {
      callSession = new CallSession({
        roomId,
        initiatedBy: userId,
        participants: [{
          userId,
          joinedAt: new Date(),
          status: 'joined'
        }],
        status: 'active',
        callType: 'video',
        metadata: {
          livekitRoom: roomId
        }
      });
    } else {
      // Add user to participants if not already there
      const existingParticipant = callSession.participants.find(
        p => p.userId.toString() === userId
      );

      if (!existingParticipant) {
        callSession.participants.push({
          userId,
          joinedAt: new Date(),
          status: 'joined'
        });
      } else {
        existingParticipant.status = 'joined';
        existingParticipant.joinedAt = new Date();
      }
    }

    await callSession.save();

    res.json({
      success: true,
      data: {
        token,
        url: livekitUrl,
        roomName: roomId,
        callSessionId: callSession._id
      }
    });

  } catch (error) {
    console.error('Create call token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create call token',
      error: error.message
    });
  }
};

/**
 * End call session
 */
export const endCall = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const callSession = await CallSession.findOne({
      roomId,
      status: 'active'
    });

    if (!callSession) {
      return res.status(404).json({
        success: false,
        message: 'No active call session found'
      });
    }

    // Update participant status
    const participant = callSession.participants.find(
      p => p.userId.toString() === userId
    );

    if (participant) {
      participant.status = 'left';
      participant.leftAt = new Date();

      // Calculate duration
      const joinedAt = new Date(participant.joinedAt);
      const leftAt = new Date(participant.leftAt);
      participant.duration = Math.floor((leftAt - joinedAt) / 1000); // in seconds
    }

    // Check if all participants have left
    const activeParticipants = callSession.participants.filter(
      p => p.status === 'joined'
    );

    if (activeParticipants.length === 0) {
      callSession.status = 'ended';
      callSession.endedAt = new Date();

      // Calculate total duration
      const startedAt = new Date(callSession.startedAt);
      const endedAt = new Date(callSession.endedAt);
      callSession.duration = Math.floor((endedAt - startedAt) / 1000);
    }

    await callSession.save();

    res.json({
      success: true,
      message: 'Left call successfully',
      data: {
        callSession: {
          _id: callSession._id,
          status: callSession.status,
          activeParticipants: activeParticipants.length
        }
      }
    });

  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end call',
      error: error.message
    });
  }
};

/**
 * Get call history for a room
 */
export const getCallHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify room access
    const member = await RoomMember.findOne({
      roomId,
      userId: req.user.id,
      isActive: true
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view call history'
      });
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      CallSession.find({ roomId })
        .populate('initiatedBy', 'username email avatar')
        .populate('participants.userId', 'username email avatar')
        .sort({ startedAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      CallSession.countDocuments({ roomId })
    ]);

    const formattedSessions = sessions.map(session => ({
      _id: session._id,
      callType: session.callType,
      status: session.status,
      duration: session.duration,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      initiatedBy: {
        _id: session.initiatedBy._id,
        username: session.initiatedBy.username,
        avatar: session.initiatedBy.avatar
      },
      participants: session.participants.map(p => ({
        user: {
          _id: p.userId._id,
          username: p.userId.username,
          avatar: p.userId.avatar
        },
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        duration: p.duration,
        status: p.status
      })),
      participantCount: session.participants.length
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call history',
      error: error.message
    });
  }
};

/**
 * Get active call session for a room
 */
export const getActiveCall = async (req, res) => {
  try {
    const { roomId } = req.params;

    const callSession = await CallSession.findOne({
      roomId,
      status: 'active'
    })
      .populate('initiatedBy', 'username email avatar')
      .populate('participants.userId', 'username email avatar');

    if (!callSession) {
      return res.json({
        success: true,
        data: { activeCall: null }
      });
    }

    const activeParticipants = callSession.participants.filter(
      p => p.status === 'joined'
    );

    res.json({
      success: true,
      data: {
        activeCall: {
          _id: callSession._id,
          callType: callSession.callType,
          startedAt: callSession.startedAt,
          initiatedBy: {
            _id: callSession.initiatedBy._id,
            username: callSession.initiatedBy.username,
            avatar: callSession.initiatedBy.avatar
          },
          participants: activeParticipants.map(p => ({
            user: {
              _id: p.userId._id,
              username: p.userId.username,
              avatar: p.userId.avatar
            },
            joinedAt: p.joinedAt
          })),
          participantCount: activeParticipants.length
        }
      }
    });

  } catch (error) {
    console.error('Get active call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active call',
      error: error.message
    });
  }
};
