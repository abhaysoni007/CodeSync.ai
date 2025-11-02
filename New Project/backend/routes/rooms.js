import express from 'express';
import { body } from 'express-validator';
import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Generate unique room code
 */
const generateRoomCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/**
 * @route   GET /rooms
 * @desc    Get all rooms for authenticated user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, projectId } = req.query;

    // Find rooms where user is a member
    const memberRecords = await RoomMember.find({
      userId: req.userId,
      isActive: true
    }).select('roomId');

    const roomIds = memberRecords.map(m => m.roomId);

    const query = {
      _id: { $in: roomIds },
      isActive: true
    };

    if (projectId) {
      query.projectId = projectId;
    }

    const rooms = await Room.find(query)
      .populate('projectId', 'name')
      .populate('creatorId', 'username email avatar')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Room.countDocuments(query);

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message
    });
  }
});

/**
 * @route   GET /rooms/:id
 * @desc    Get room by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('projectId', 'name description')
      .populate('creatorId', 'username email avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a member
    const membership = await RoomMember.findOne({
      roomId: room._id,
      userId: req.userId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get active members
    const members = await RoomMember.find({
      roomId: room._id,
      isActive: true
    }).populate('userId', 'username email avatar');

    res.json({
      success: true,
      data: {
        room,
        members,
        myRole: membership.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching room',
      error: error.message
    });
  }
});

/**
 * @route   POST /rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Room name is required'),
  body('projectId').notEmpty().withMessage('Project ID is required')
], async (req, res) => {
  try {
    const { name, projectId, description, maxMembers, password, settings } = req.body;

    // Generate unique room code
    let roomCode;
    let isUnique = false;
    
    while (!isUnique) {
      roomCode = generateRoomCode();
      const existing = await Room.findOne({ roomCode });
      if (!existing) isUnique = true;
    }

    const room = new Room({
      name,
      roomCode,
      projectId,
      creatorId: req.userId,
      description,
      maxMembers: maxMembers || 10,
      password,
      settings: settings || {}
    });

    await room.save();

    // Add creator as host member
    const member = new RoomMember({
      roomId: room._id,
      userId: req.userId,
      role: 'host',
      status: 'online',
      permissions: {
        canEdit: true,
        canChat: true,
        canAudio: true,
        canVideo: true,
        canScreenShare: true
      }
    });

    await member.save();

    await room.populate('projectId', 'name');
    await room.populate('creatorId', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room',
      error: error.message
    });
  }
});

/**
 * @route   POST /rooms/:id/join
 * @desc    Join a room by room code
 * @access  Private
 */
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room || !room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if already a member
    const existingMember = await RoomMember.findOne({
      roomId: room._id,
      userId: req.userId
    });

    if (existingMember) {
      existingMember.isActive = true;
      existingMember.status = 'online';
      await existingMember.save();

      return res.json({
        success: true,
        message: 'Rejoined room successfully',
        data: { room, member: existingMember }
      });
    }

    // Check room capacity
    const memberCount = await RoomMember.countDocuments({
      roomId: room._id,
      isActive: true
    });

    if (memberCount >= room.maxMembers) {
      return res.status(403).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Add as new member
    const member = new RoomMember({
      roomId: room._id,
      userId: req.userId,
      role: 'participant',
      status: 'online'
    });

    await member.save();

    res.json({
      success: true,
      message: 'Joined room successfully',
      data: { room, member }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error joining room',
      error: error.message
    });
  }
});

export default router;
