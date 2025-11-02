import AIProviderService from '../services/AIProviderService.js';
import AIInteraction from '../models/AIInteraction.js';
import UserAPIKey from '../models/UserAPIKey.js';
import encryptionHelper from '../utils/encryption.js';

/**
 * Handle AI request (Gemini only)
 */
export const handleAIRequest = async (req, res) => {
  try {
    const { prompt, model, systemPrompt, temperature, maxTokens } = req.body;
    const userId = req.userId; // Changed from req.user.id to req.userId

    // Validate input
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    // Validate prompt length
    if (prompt.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Prompt too long (max 10000 characters)'
      });
    }

    let apiKey = null;

    // Enhanced system prompt for coding assistance
    const defaultSystemPrompt = systemPrompt || `You are CodeSync.AI, an expert coding assistant powered by Gemini. Your role is to provide:
- Clear, detailed explanations of programming concepts
- Complete, working code examples with proper formatting
- Step-by-step guidance for complex problems
- Best practices and common pitfalls to avoid
- Production-ready, well-documented solutions
- Debugging help with specific error analysis

Format your responses with:
- Proper markdown for code blocks
- Syntax highlighting (specify language)
- Clear section headers
- Examples and use cases
- Additional resources when relevant`;

    console.log('🔍 DEBUG: Looking for Gemini API key:', { userId });
    
    // Get Gemini API key from database
    const userApiKey = await UserAPIKey.findOne({
      userId,
      provider: 'google',
      isActive: true
    });

    console.log('🔍 DEBUG: API key found?', !!userApiKey);

    if (!userApiKey) {
      console.log(`❌ No Gemini API key found for user ${userId}`);
      console.log(`💡 Hint: Get free API key from https://aistudio.google.com/`);
      
      const fallbackResult = await AIProviderService.processRequest(
        'gemini',
        null,
        prompt,
        { model, systemPrompt: defaultSystemPrompt, temperature, maxTokens }
      );

      // Save interaction
      const interaction = await AIInteraction.create({
        userId,
        type: 'chat',
        prompt,
        response: fallbackResult.data.content,
        model: 'no-api-key',
        tokensUsed: {
          prompt: fallbackResult.data.usage?.promptTokens || 0,
          completion: fallbackResult.data.usage?.completionTokens || 0,
          total: fallbackResult.data.usage?.totalTokens || 0
        }
      });

      return res.json({
        success: true,
        message: 'No Gemini API key configured',
        data: {
          response: fallbackResult.data.content,
          provider: 'fallback',
          model: 'no-api-key',
          usage: fallbackResult.data.usage,
          interactionId: interaction._id,
          isFallback: true
        }
      });
    }

    console.log('✅ Found Gemini API key');

    // Decrypt API key
    apiKey = encryptionHelper.decryptAPIKey(
      userApiKey.encryptedKey,
      userApiKey.iv,
      userApiKey.authTag
    );
    
    // Update last used timestamp
    userApiKey.lastUsed = new Date();
    await userApiKey.save();

    // Process AI request with Gemini
    const result = await AIProviderService.processRequest(
      'gemini',
      apiKey,
      prompt,
      { 
        model: model || 'gemini-2.0-flash-exp',
        systemPrompt: defaultSystemPrompt, 
        temperature: temperature !== undefined ? temperature : 0.7, 
        maxTokens: maxTokens || 8000 
      }
    );

    // Save interaction
    const interaction = await AIInteraction.create({
      userId,
      type: 'chat',
      prompt,
      response: result.data.content,
      model: result.data.model,
      tokensUsed: {
        prompt: result.data.usage?.promptTokens || 0,
        completion: result.data.usage?.completionTokens || 0,
        total: result.data.usage?.totalTokens || 0
      }
    });

    res.json({
      success: true,
      data: {
        response: result.data.content,
        provider: 'gemini',
        model: result.data.model,
        usage: result.data.usage,
        interactionId: interaction._id,
        isFallback: result.fallback || false
      }
    });

  } catch (error) {
    console.error('❌ AI request error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI request',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get AI interaction history
 */
export const getInteractionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, provider, startDate, endDate } = req.query;

    const query = { userId };

    if (provider) {
      query.provider = provider.toLowerCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [interactions, total] = await Promise.all([
      AIInteraction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v'),
      AIInteraction.countDocuments(query)
    ]);

    // Calculate total usage stats
    const stats = await AIInteraction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$provider',
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        interactions,
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            requests: stat.totalRequests,
            tokens: stat.totalTokens,
            cost: stat.totalCost
          };
          return acc;
        }, {}),
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get interaction history',
      error: error.message
    });
  }
};

/**
 * Get single interaction details
 */
export const getInteractionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const interaction = await AIInteraction.findOne({
      _id: id,
      userId
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    res.json({
      success: true,
      data: { interaction }
    });

  } catch (error) {
    console.error('Get interaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get interaction details',
      error: error.message
    });
  }
};

/**
 * Delete interaction
 */
export const deleteInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const interaction = await AIInteraction.findOneAndDelete({
      _id: id,
      userId
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Interaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete interaction',
      error: error.message
    });
  }
};

/**
 * Get usage statistics
 */
export const getUsageStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const stats = await AIInteraction.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            provider: '$provider',
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            }
          },
          requests: { $sum: 1 },
          tokens: { $sum: '$tokensUsed' },
          cost: { $sum: '$cost' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get total stats
    const totals = await AIInteraction.aggregate([
      { $match: { userId, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        daily: stats,
        totals: totals[0] || {
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0
        }
      }
    });

  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics',
      error: error.message
    });
  }
};

/**
 * Calculate estimated cost based on provider and token usage
 */
function calculateCost(provider, model, usage) {
  // Approximate pricing (as of 2024)
  const pricing = {
    openai: {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // per 1K tokens
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    },
    claude: {
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-opus': { input: 0.015, output: 0.075 }
    },
    gemini: {
      'gemini-pro': { input: 0.000125, output: 0.000375 }
    },
    groq: {
      'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027 },
      'llama2-70b': { input: 0.0007, output: 0.0008 }
    },
    free: {
      'free-assistant-v1': { input: 0, output: 0 }
    }
  };

  const providerPricing = pricing[provider.toLowerCase()];
  if (!providerPricing) return 0;

  const modelPricing = providerPricing[model] || Object.values(providerPricing)[0];
  if (!modelPricing) return 0;

  const inputCost = (usage.promptTokens / 1000) * modelPricing.input;
  const outputCost = (usage.completionTokens / 1000) * modelPricing.output;

  return Number((inputCost + outputCost).toFixed(6));
}
