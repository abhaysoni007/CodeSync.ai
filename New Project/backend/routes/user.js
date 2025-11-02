import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import UserAPIKey from '../models/UserAPIKey.js';
import { authenticate } from '../middleware/auth.js';
import encryptionHelper from '../utils/encryption.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * @route   GET /user/me
 * @desc    Get current user profile with API key status
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get API key status from UserAPIKey model
    const userApiKeys = await UserAPIKey.find({
      userId: req.userId,
      isActive: true
    }).select('provider');

    // Build apiKeys object with provider status
    const apiKeysStatus = {};
    userApiKeys.forEach(key => {
      apiKeysStatus[key.provider] = '••••••••'; // Masked for security
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          apiKeys: apiKeysStatus
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

/**
 * @route   POST /user/update
 * @desc    Update user profile (fullName, avatar)
 * @access  Private
 */
router.post('/update', authenticate, upload.single('avatar'), [
  body('fullName').optional().trim().isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fullName if provided
    if (req.body.fullName !== undefined) {
      user.fullName = req.body.fullName;
    }

    // Update avatar if file was uploaded
    if (req.file) {
      // Delete old avatar if exists
      if (user.avatar) {
        const oldAvatarPath = path.join(process.cwd(), user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      user.avatar = '/uploads/avatars/' + req.file.filename;
    }

    user.updatedAt = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

/**
 * @route   POST /user/keys
 * @desc    Update Gemini API key with encryption
 * @access  Private
 */
router.post('/keys', authenticate, [
  body('provider').isIn(['google'])
    .withMessage('Only Google (Gemini) provider is supported'),
  body('apiKey').optional().isString().withMessage('API key must be a string'),
  body('action').optional().isIn(['set', 'delete']).withMessage('Action must be set or delete')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { provider, apiKey, action = 'set' } = req.body;
    
    console.log('🔑 API Key Update Request:', {
      userId: req.userId,
      provider,
      action,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length
    });

    if (action === 'delete') {
      // Delete the API key from UserAPIKey model
      await UserAPIKey.findOneAndUpdate(
        { userId: req.userId, provider },
        { isActive: false },
        { new: true }
      );

      res.json({
        success: true,
        message: `${provider} API key deleted successfully`,
        data: {
          provider,
          action: 'delete',
          hasKey: false
        }
      });
    } else {
      // Set/update the API key with encryption
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API key is required when action is set'
        });
      }

      // Encrypt the API key
      const encrypted = encryptionHelper.encryptAPIKey(apiKey);

      console.log('🔐 Encrypted data:', {
        hasEncryptedKey: !!encrypted.encryptedKey,
        hasIv: !!encrypted.iv,
        hasAuthTag: !!encrypted.authTag,
        encryptedKeyLength: encrypted.encryptedKey?.length
      });

      // Upsert the API key
      const result = await UserAPIKey.findOneAndUpdate(
        { userId: req.userId, provider },
        {
          userId: req.userId,
          provider,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`,
          keyHash: encrypted.keyHash,
          encryptedKey: encrypted.encryptedKey,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          isActive: true,
          lastUsed: null
        },
        { upsert: true, new: true }
      );

      console.log('✅ API Key saved successfully:', {
        userId: req.userId,
        provider,
        keyId: result._id,
        isNew: !result.lastUsed
      });

      res.json({
        success: true,
        message: `Gemini API key updated successfully`,
        data: {
          provider,
          action: 'set',
          hasKey: true
        }
      });
    }
  } catch (error) {
    console.error('Update API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating API keys',
      error: error.message
    });
  }
});

export default router;
