import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Provider Service - Gemini Only
 * Supports Gemini 2.0 Flash and Pro models
 * Free tier API key available from AI Studio: https://aistudio.google.com/
 */

class AIProviderService {

  /**
   * Call Google Gemini API
   * Supports: gemini-2.0-flash-exp, gemini-1.5-pro
   */
  async callGemini(apiKey, prompt, options = {}) {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = options.systemPrompt || `You are CodeSync AI, an expert programming assistant. Provide detailed, accurate coding help with:
- Clear explanations of programming concepts
- Complete, working code examples with proper formatting
- Step-by-step guidance and best practices
- Real-world solutions with error handling
- Performance optimization tips`;

    // Default to Gemini 2.0 Flash for speed, or Pro for complex tasks
    const modelName = options.model || 'gemini-2.0-flash-exp';

    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        maxOutputTokens: options.maxTokens || 8000,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      provider: 'gemini',
      model: modelName,
      content: text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      },
      metadata: {
        finishReason: response.candidates?.[0]?.finishReason || 'STOP'
      }
    };
  }

  /**
   * Fallback response when no API key is configured
   */
  async callFallback(prompt, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = `# ⚠️ Gemini API Key Required

Your question: "${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}"

## 🔑 Get Free Gemini API Key

1. **Visit:** https://aistudio.google.com/
2. **Sign in** with Google account
3. **Click "Get API Key"**
4. **Copy** your free API key
5. **Go to Profile Settings** → **API Keys** tab
6. **Paste** your Gemini API key and save

## 🚀 Available Models

- **Gemini 2.0 Flash** - Ultra-fast responses (Recommended)
- **Gemini 1.5 Pro** - Advanced reasoning and longer context

## 💎 Free Tier Benefits

✅ 15 requests per minute
✅ 1 million tokens per day
✅ No credit card required
✅ Full model capabilities

Configure your API key to get detailed, AI-powered responses!`;

    return {
      provider: 'fallback',
      model: 'no-api-key',
      content: response,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(response.length / 4),
        totalTokens: Math.ceil((prompt.length + response.length) / 4)
      },
      metadata: {
        isFallback: true,
        finishReason: 'stop'
      }
    };
  }

  /**
   * Route request to Gemini API
   */
  async processRequest(provider, apiKey, prompt, options = {}) {
    try {
      if (!apiKey) {
        throw new Error('Gemini API key required');
      }

      const result = await this.callGemini(apiKey, prompt, options);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error(`Gemini API error:`, error.message);
      
      // Return fallback message
      const fallbackResult = await this.callFallback(prompt, options);
      
      return {
        success: false,
        error: error.message,
        fallback: true,
        data: fallbackResult
      };
    }
  }
}

export default new AIProviderService();
