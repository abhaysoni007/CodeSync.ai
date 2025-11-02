# PHASE 5: AI Integration Guide

## 🤖 Overview

Phase 5 integrates **5 AI providers** into the collaborative code editor with **encrypted API key storage**, **automatic fallback**, and **usage tracking**. Users can leverage OpenAI, Claude, Gemini, Groq, or a free assistant without any API keys.

---

## 📦 Features

### ✅ Multi-Provider Support
- **OpenAI** (GPT-3.5, GPT-4, GPT-4 Turbo)
- **Anthropic Claude** (Haiku, Sonnet, Opus)
- **Google Gemini** (Gemini Pro)
- **Groq** (Mixtral, Llama2) - Ultra-fast inference
- **Free Assistant** - No API key required

### 🔐 Secure API Key Management
- **AES-256-GCM Encryption** for all API keys
- Keys stored in MongoDB with `iv` and `authTag`
- Master key from environment variables
- Per-user encrypted storage in `UserAPIKey` collection

### 🛡️ Rate Limiting
- **AI Requests**: 30 per hour per user
- **History/Stats**: 100 per hour per user
- Automatic retry-after headers
- IP-based fallback for unauthenticated requests

### 📊 Usage Tracking
- All interactions saved to `AIInteraction` collection
- Token usage tracking (prompt + completion)
- Cost calculation for each provider
- Daily/weekly/monthly statistics
- Provider-specific analytics

### 🔄 Intelligent Fallback
- Auto-fallback to free provider if:
  - No API key configured
  - API key invalid/expired
  - Provider returns error
  - Rate limit exceeded
- Seamless user experience

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend       │
│  AIRequestPanel │
│  .jsx           │
└────────┬────────┘
         │ POST /ai/request
         │ (provider, prompt, model, etc.)
         ▼
┌─────────────────┐
│  Backend        │
│  AIController   │
│  .js            │
└────────┬────────┘
         │ 1. Authenticate user
         │ 2. Fetch encrypted API key
         │ 3. Decrypt with master key
         ▼
┌─────────────────┐
│  AIProvider     │
│  Service.js     │
└────────┬────────┘
         │ Route to specific provider
         ▼
┌──────────────────────────────────────┐
│  Provider APIs                       │
│  OpenAI │ Claude │ Gemini │ Groq    │
│  Free Assistant (pattern matching)   │
└──────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB        │
│  AIInteraction  │
│  Collection     │
└─────────────────┘
```

---

## 🚀 Quick Start

### Backend Setup

1. **Install AI SDKs** (already done):
```bash
cd backend
npm install openai @anthropic-ai/sdk @google/generative-ai groq-sdk
```

2. **Environment Variables** (`.env`):
```env
# Encryption (required)
MASTER_KEY=your-master-encryption-key-32-chars-minimum-change-in-production

# Optional: Global fallback API keys (for testing)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...
```

3. **Server is already running** with AI routes registered:
```javascript
// server.js
import aiRoutes from './routes/ai.js';
app.use('/ai', aiRoutes);
```

### Frontend Integration

1. **Import AIRequestPanel**:
```jsx
import AIRequestPanel from './components/AIRequestPanel';

function App() {
  const token = "your-jwt-token"; // From authentication
  
  return (
    <div>
      <AIRequestPanel token={token} />
    </div>
  );
}
```

2. **Environment Variables** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
```

---

## 📡 API Endpoints

### 1. Send AI Request

**POST** `/api/ai/request`

Request:
```json
{
  "provider": "openai",
  "prompt": "Explain async/await in JavaScript",
  "model": "gpt-3.5-turbo",
  "systemPrompt": "You are a helpful coding assistant",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

Response:
```json
{
  "success": true,
  "data": {
    "response": "Async/await is syntactic sugar...",
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "usage": {
      "promptTokens": 15,
      "completionTokens": 250,
      "totalTokens": 265
    },
    "cost": 0.0004,
    "interactionId": "64f8a...",
    "isFallback": false
  }
}
```

**Providers:**
- `openai` - GPT models
- `claude` - Claude models
- `gemini` - Gemini Pro
- `groq` - Fast inference (Mixtral, Llama2)
- `free` - No API key required

---

### 2. Get Interaction History

**GET** `/api/ai/history?page=1&limit=20&provider=openai`

Response:
```json
{
  "success": true,
  "data": {
    "interactions": [
      {
        "_id": "64f8a...",
        "userId": "64f7b...",
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "prompt": "Explain async/await...",
        "response": "Async/await is...",
        "tokensUsed": 265,
        "cost": 0.0004,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "stats": {
      "openai": {
        "requests": 45,
        "tokens": 12500,
        "cost": 0.025
      },
      "free": {
        "requests": 10,
        "tokens": 2500,
        "cost": 0
      }
    },
    "pagination": {
      "total": 55,
      "page": 1,
      "pages": 3,
      "limit": 20
    }
  }
}
```

---

### 3. Get Usage Statistics

**GET** `/api/ai/stats?period=30d`

Response:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "startDate": "2023-12-15T00:00:00Z",
    "endDate": "2024-01-15T00:00:00Z",
    "daily": [
      {
        "_id": {
          "provider": "openai",
          "date": "2024-01-14"
        },
        "requests": 8,
        "tokens": 1850,
        "cost": 0.0037
      }
    ],
    "totals": {
      "totalRequests": 245,
      "totalTokens": 58000,
      "totalCost": 0.116
    }
  }
}
```

---

### 4. Get Single Interaction

**GET** `/api/ai/interaction/:id`

Response:
```json
{
  "success": true,
  "data": {
    "interaction": {
      "_id": "64f8a...",
      "userId": "64f7b...",
      "provider": "claude",
      "model": "claude-3-haiku-20240307",
      "prompt": "Review this React component...",
      "response": "This component looks good, but...",
      "tokensUsed": 450,
      "cost": 0.000562,
      "metadata": {
        "temperature": 0.7,
        "maxTokens": 2000
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### 5. Delete Interaction

**DELETE** `/api/ai/interaction/:id`

Response:
```json
{
  "success": true,
  "message": "Interaction deleted successfully"
}
```

---

## 🔐 API Key Management

### Storing User API Keys

Users store their own encrypted API keys in the database:

```javascript
// Example: Store OpenAI API key
import encryptionHelper from './utils/encryption.js';
import UserAPIKey from './models/UserAPIKey.js';

async function storeAPIKey(userId, provider, apiKey) {
  const { encryptedKey, iv, authTag } = encryptionHelper.encryptAPIKey(apiKey);
  
  await UserAPIKey.create({
    userId,
    provider,
    encryptedKey,
    iv,
    authTag,
    isActive: true
  });
}
```

### Retrieving and Decrypting

```javascript
// AIController.js automatically handles decryption
const userApiKey = await UserAPIKey.findOne({
  userId,
  provider: 'openai',
  isActive: true
});

const apiKey = encryptionHelper.decryptAPIKey(
  userApiKey.encryptedKey,
  userApiKey.iv,
  userApiKey.authTag
);
```

---

## 🆓 Free Provider

### How It Works

The **free provider** uses **pattern matching** to provide helpful responses without any API calls:

```javascript
// AIProviderService.js
async callFreeProvider(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('explain')) {
    return "Let me explain: [helpful explanation]";
  }
  
  if (lowerPrompt.includes('bug') || lowerPrompt.includes('fix')) {
    return "Common issues to check: [debugging tips]";
  }
  
  // Default response
  return "I'm a free AI assistant. For advanced features, please configure an API key.";
}
```

### Supported Queries
- **Explain** concepts
- **Fix bugs** / debugging help
- **Code review** suggestions
- **Generate** code snippets
- General **programming** questions

### Limitations
- Simple pattern-based responses
- No advanced reasoning
- Limited context understanding
- 500ms simulated delay

---

## 💰 Cost Calculation

Automatic cost tracking for all providers:

| Provider | Model | Input (per 1K tokens) | Output (per 1K tokens) |
|----------|-------|----------------------|------------------------|
| OpenAI | GPT-3.5 Turbo | $0.0005 | $0.0015 |
| OpenAI | GPT-4 | $0.03 | $0.06 |
| OpenAI | GPT-4 Turbo | $0.01 | $0.03 |
| Claude | Haiku | $0.00025 | $0.00125 |
| Claude | Sonnet | $0.003 | $0.015 |
| Claude | Opus | $0.015 | $0.075 |
| Gemini | Pro | $0.000125 | $0.000375 |
| Groq | Mixtral 8x7B | $0.00027 | $0.00027 |
| Free | - | $0 | $0 |

---

## 🛠️ Frontend Component

### Provider Selection

```jsx
<select value={provider} onChange={(e) => setProvider(e.target.value)}>
  <option value="free">Free (No API Key)</option>
  <option value="openai">OpenAI (GPT)</option>
  <option value="claude">Anthropic Claude</option>
  <option value="gemini">Google Gemini</option>
  <option value="groq">Groq (Fast)</option>
</select>
```

### Model Options

Each provider has specific models:
- **OpenAI**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **Claude**: `claude-3-haiku`, `claude-3-sonnet`, `claude-3-opus`
- **Gemini**: `gemini-pro`
- **Groq**: `mixtral-8x7b-32768`, `llama2-70b-4096`
- **Free**: `free-assistant-v1`

### Advanced Settings

```jsx
<input
  type="range"
  min="0"
  max="2"
  step="0.1"
  value={temperature}
  onChange={(e) => setTemperature(e.target.value)}
/>
```

- **Temperature**: 0.0-2.0 (creativity level)
- **Max Tokens**: 100-4000 (response length)

---

## 📊 MongoDB Schemas

### AIInteraction
```javascript
{
  userId: ObjectId,
  provider: String, // 'openai' | 'claude' | 'gemini' | 'groq' | 'free'
  model: String,
  prompt: String,
  response: String,
  tokensUsed: Number,
  cost: Number,
  metadata: Object,
  createdAt: Date
}
```

### UserAPIKey
```javascript
{
  userId: ObjectId,
  provider: String,
  encryptedKey: String,
  iv: String,
  authTag: String,
  isActive: Boolean,
  createdAt: Date
}
```

---

## 🧪 Testing Guide

### 1. Test Free Provider
```bash
curl -X POST http://localhost:5000/ai/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "free",
    "prompt": "Explain closures in JavaScript"
  }'
```

### 2. Test OpenAI (with API key)
```bash
# First, store your API key in database
# Then make request:
curl -X POST http://localhost:5000/ai/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "prompt": "Write a React hook for API calls",
    "temperature": 0.7
  }'
```

### 3. Test Fallback Behavior
```bash
# Request with invalid provider will fallback to free
curl -X POST http://localhost:5000/ai/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "prompt": "Debug this error"
  }'
# Response will include: "isFallback": true
```

### 4. Check Usage Stats
```bash
curl http://localhost:5000/ai/stats?period=7d \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚨 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Provider and prompt are required` | Missing fields | Include both `provider` and `prompt` |
| `Prompt too long (max 10000 characters)` | Prompt > 10K chars | Reduce prompt length |
| `No API key found for openai` | Key not stored | Add API key or use free provider |
| `Too many AI requests` | Rate limit | Wait 1 hour or upgrade limit |
| `Decryption failed` | Corrupted key | Re-add API key |

### Automatic Fallback

All errors automatically fallback to free provider:
```json
{
  "success": true,
  "message": "Using free provider (no API key configured)",
  "data": {
    "isFallback": true,
    "provider": "free"
  }
}
```

---

## 🔧 Configuration

### Rate Limits (Customizable)

Edit `backend/routes/ai.js`:
```javascript
const aiRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Change this to increase/decrease limit
});
```

### Add New Provider

1. **Install SDK**:
```bash
npm install new-ai-sdk
```

2. **Add to AIProviderService.js**:
```javascript
async callNewProvider(apiKey, prompt, options = {}) {
  const client = new NewAIClient({ apiKey });
  const response = await client.generate({ prompt, ...options });
  
  return {
    success: true,
    data: {
      provider: 'newprovider',
      model: options.model || 'default-model',
      content: response.text,
      usage: {
        promptTokens: response.usage.input,
        completionTokens: response.usage.output,
        totalTokens: response.usage.total
      },
      metadata: { requestId: response.id }
    }
  };
}
```

3. **Update processRequest() router**:
```javascript
case 'newprovider':
  return await this.callNewProvider(apiKey, prompt, options);
```

---

## 📝 Best Practices

### 1. **Always Use Free Provider as Fallback**
```javascript
// Frontend
const [provider, setProvider] = useState('free'); // Start with free
```

### 2. **Implement Client-Side Rate Limiting**
```javascript
// Track requests in localStorage
const requests = JSON.parse(localStorage.getItem('aiRequests') || '[]');
const recentRequests = requests.filter(
  r => Date.now() - r.timestamp < 3600000 // 1 hour
);
if (recentRequests.length >= 30) {
  alert('Rate limit reached. Try again in 1 hour.');
  return;
}
```

### 3. **Show Usage Stats to Users**
```jsx
{stats && (
  <div>
    Total Requests: {stats.totalRequests}
    Total Cost: ${stats.totalCost.toFixed(4)}
  </div>
)}
```

### 4. **Validate Input Before Sending**
```javascript
if (!prompt.trim()) {
  setError('Please enter a prompt');
  return;
}
if (prompt.length > 10000) {
  setError('Prompt too long');
  return;
}
```

---

## 🎉 Success!

**Phase 5 Complete!** You now have:

✅ 5 AI providers integrated  
✅ Encrypted API key storage  
✅ Automatic fallback mechanism  
✅ Usage tracking & cost calculation  
✅ Rate limiting & security  
✅ Full-featured frontend panel  
✅ Comprehensive API documentation  

**Next Steps:**
- Test all providers with real API keys
- Customize rate limits for your use case
- Add more providers as needed
- Implement AI-powered code suggestions in Monaco Editor

---

## 📞 Support

For issues or questions:
- Check error logs in backend console
- Verify `.env` has `MASTER_KEY` set
- Ensure MongoDB is connected
- Test with free provider first
- Check rate limit headers in response

**Happy Coding! 🚀**
