import express from 'express';
import { body } from 'express-validator';
import Project from '../models/Project.js';
import Activity from '../models/Activity.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /projects
 * @desc    Get all projects for authenticated user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {
      $or: [
        { ownerId: req.userId },
        { 'members.userId': req.userId }
      ],
      isArchived: false
    };

    if (search) {
      query.$and = [{
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      }];
    }

    const projects = await Project.find(query)
      .populate('ownerId', 'username email avatar')
      .populate('members.userId', 'username email avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
});

/**
 * @route   GET /projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('ownerId', 'username email avatar')
      .populate('members.userId', 'username email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access
    const hasAccess = project.ownerId._id.toString() === req.userId.toString() ||
      project.members.some(m => m.userId._id.toString() === req.userId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
});

/**
 * @route   POST /projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const { name, description, tags, settings } = req.body;

    // Generate unique join code
    const joinCode = await Project.generateJoinCode();

    const project = new Project({
      name,
      description,
      joinCode,
      ownerId: req.userId,
      tags: tags || [],
      settings: settings || {},
      members: [{
        userId: req.userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    await project.save();
    await project.populate('ownerId', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
});

/**
 * @route   PUT /projects/:id
 * @desc    Update project
 * @access  Private (Owner/Admin only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can update'
      });
    }

    const { name, description, tags, settings } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (tags) project.tags = tags;
    if (settings) project.settings = { ...project.settings, ...settings };

    await project.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /projects/:id
 * @desc    Delete (archive) project
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can delete'
      });
    }

    project.isArchived = true;
    await project.save();

    res.json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
});

/**
 * @route   POST /projects/join
 * @desc    Join a project using join code
 * @access  Private
 */
router.post('/join', authenticate, [
  body('code').trim().notEmpty().withMessage('Join code is required')
], async (req, res) => {
  try {
    const { code } = req.body;

    // Find project by join code
    const project = await Project.findOne({ joinCode: code, isArchived: false })
      .populate('ownerId', 'username email avatar')
      .populate('members.userId', 'username email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Invalid join code or project not found'
      });
    }

    // Check if user is already a member
    const isMember = project.members.some(
      m => m.userId._id.toString() === req.userId.toString()
    );

    if (isMember) {
      // User is already a member, return success with project data
      return res.json({
        success: true,
        message: 'You are already a member of this project',
        data: { project }
      });
    }

    // Add user to project members
    project.members.push({
      userId: req.userId,
      role: 'editor',
      joinedAt: new Date()
    });

    await project.save();
    await project.populate('members.userId', 'username email avatar');

    res.json({
      success: true,
      message: 'Successfully joined project',
      data: { project }
    });
  } catch (error) {
    console.error('Join project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining project',
      error: error.message
    });
  }
});

/**
 * @route   GET /projects/:id/activity
 * @desc    Get activity timeline for a project
 * @access  Private
 */
router.get('/:id/activity', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const projectId = req.params.id;

    // Verify user has access to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const hasAccess = project.ownerId.toString() === req.userId.toString() ||
      project.members.some(m => m.userId.toString() === req.userId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    const query = { projectId };
    if (type) {
      query.type = type;
    }

    // Fetch activities
    const activities = await Activity.find(query)
      .populate('userId', 'username email avatar')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity',
      error: error.message
    });
  }
});

/**
 * @route   GET /projects/:id/messages
 * @desc    Get chat messages for a project
 * @access  Private
 */
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { page = 1, limit = 50, before } = req.query;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const hasAccess = project.ownerId.toString() === req.userId.toString() ||
      project.members.some(m => m.userId.toString() === req.userId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    const query = { 
      projectId,
      isDeleted: false
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages
    const messages = await Message.find(query)
      .populate('senderId', 'username email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      userId: msg.senderId._id,
      username: msg.senderId.username,
      message: msg.content,
      sender: {
        _id: msg.senderId._id,
        username: msg.senderId.username,
        email: msg.senderId.email,
        avatar: msg.senderId.avatar
      },
      timestamp: msg.createdAt.toISOString(),
      createdAt: msg.createdAt,
      type: msg.type,
      isRead: msg.readBy?.includes(req.userId) || false
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

/**
 * @route   GET /projects/:id/files
 * @desc    Get all files for a project
 * @access  Private
 */
router.get('/:id/files', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const hasAccess = project.ownerId.toString() === req.userId.toString() ||
      project.members.some(m => m.userId.toString() === req.userId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return demo files for now
    const demoFiles = [
      {
        _id: '1',
        name: 'index.js',
        path: '/src/index.js',
        type: 'file',
        language: 'javascript',
        size: 1024,
        content: '// Main entry point\nconsole.log("Hello World");',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        name: 'App.jsx',
        path: '/src/App.jsx',
        type: 'file',
        language: 'javascript',
        size: 2048,
        content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello React</div>;\n}\n\nexport default App;',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        name: 'styles.css',
        path: '/src/styles.css',
        type: 'file',
        language: 'css',
        size: 512,
        content: 'body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: {
        files: demoFiles
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
});

export default router;
