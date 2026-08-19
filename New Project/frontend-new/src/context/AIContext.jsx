import { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';

const AIContext = createContext(null);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const [model, setModel] = useState('gemini-2.0-flash-exp'); // Gemini model selection
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // Switch Gemini Model
  const switchModel = useCallback((newModel) => {
    setModel(newModel);
    const modelNames = {
      'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro'
    };
    toast.success(`Switched to ${modelNames[newModel] || newModel}`);
  }, []);

  // Add message to chat
  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { ...message, id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }]);
  }, []);

  // Ask Mode - Q&A Interface
  const askQuestion = useCallback(async (prompt) => {
    setIsLoading(true);
    
    // Add user message
    addMessage({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await api.sendAIRequest({
        prompt: prompt,
        model: model, // Use selected Gemini model
        systemPrompt: `You are CodeSync.AI, an expert coding assistant. Provide clear, detailed answers with code examples when relevant. Format code using markdown syntax highlighting. Be comprehensive but concise.`,
        temperature: 0.7,
        maxTokens: 8000
      });

      const aiResponse = response.data.data.response;
      const usedModel = response.data.data.model;
      const isFallback = response.data.data.isFallback;
      
      // Add AI response
      addMessage({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          provider: 'gemini',
          model: usedModel,
          tokens: response.data.data.usage?.totalTokens,
          isFallback: isFallback
        }
      });

      // Add to history
      setHistory((prev) => [...prev, {
        mode: 'ask',
        prompt,
        response: aiResponse,
        provider: 'gemini',
        model: usedModel,
        timestamp: new Date().toISOString()
      }]);

      return aiResponse;

    } catch (error) {
      console.error('Ask Mode Error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to get AI response';
      
      addMessage({
        role: 'error',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, model]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const value = {
    model,
    setModel,
    switchModel,
    messages,
    addMessage,
    isLoading,
    isPanelOpen,
    togglePanel,
    history,
    askQuestion,
    clearMessages
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

AIProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AIContext;
