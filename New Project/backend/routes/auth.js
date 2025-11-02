import express from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import { generateTokens } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /auth/signup OR /auth/register
 * @desc    Register a new user
 * @access  Public
 */
const registerHandler = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName: fullName || username
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: tokens.accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim()
];

router.post('/signup', registerValidation, registerHandler);
router.post('/register', registerValidation, registerHandler);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful',
      token: tokens.accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

/**
 * @route   GET /auth/me OR /auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
const profileHandler = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

router.get('/me', authenticate, profileHandler);
router.get('/profile', authenticate, profileHandler);

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client should remove token)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // Server can optionally maintain a blacklist of tokens
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
});

/**
 * @route   GET /auth/api-keys
 * @desc    Get user's API keys
 * @access  Private
 */
router.get('/api-keys', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('apiKeys');
    
    res.json({
      success: true,
      data: {
        apiKeys: user?.apiKeys || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching API keys',
      error: error.message
    });
  }
});

/**
 * @route   PUT /auth/api-keys/:provider
 * @desc    Update API key for a specific provider
 * @access  Private
 */
router.put('/api-keys/:provider', authenticate, [
  body('apiKey').notEmpty().withMessage('API key is required')
], async (req, res) => {
  try {
    const { provider } = req.params;
    const { apiKey } = req.body;

    const validProviders = ['openai', 'anthropic', 'google', 'groq', 'freemodel'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be one of: ' + validProviders.join(', ')
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize apiKeys object if it doesn't exist
    if (!user.apiKeys) {
      user.apiKeys = {};
    }

    // Update the API key for the provider
    user.apiKeys[provider] = apiKey;
    user.markModified('apiKeys'); // Important for nested objects in Mongoose
    await user.save();

    res.json({
      success: true,
      message: `${provider} API key updated successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating API key',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /auth/api-keys/:provider
 * @desc    Delete API key for a specific provider
 * @access  Private
 */
router.delete('/api-keys/:provider', authenticate, async (req, res) => {
  try {
    const { provider } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.apiKeys && user.apiKeys[provider]) {
      delete user.apiKeys[provider];
      user.markModified('apiKeys');
      await user.save();
    }

    res.json({
      success: true,
      message: `${provider} API key deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting API key',
      error: error.message
    });
  }
});

export default router;
