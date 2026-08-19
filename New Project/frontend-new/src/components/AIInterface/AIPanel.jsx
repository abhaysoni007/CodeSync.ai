import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAI } from '@/context/AIContext';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import HistoryTab from './HistoryTab';
import { FiX, FiMaximize2, FiMinimize2, FiTrash2, FiClock, FiCpu } from 'react-icons/fi';
import PropTypes from 'prop-types';

const AIPanel = ({ onClose }) => {
  const {
    messages,
    isLoading,
    history,
    clearMessages,
    askQuestion
  } = useAI();

  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');

    try {
      await askQuestion(userInput);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`fixed right-0 top-0 h-screen bg-[#0D0F12] border-l border-[#292E38] shadow-2xl z-50 flex flex-col ${
        isMaximized ? 'w-full' : 'w-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#292E38] bg-[#15181D]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-vscode-accent/10 border border-vscode-accent/20">
            <FiCpu className="w-4 h-4 text-vscode-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              AI Code Assistant
            </h2>
            <p className="text-[11px] text-gray-400">Ask mode • Gemini AI</p>
          </div>
          {isLoading && (
            <span className="text-xs text-vscode-accent animate-pulse ml-2">Thinking...</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-[#1C2027] rounded text-gray-400 hover:text-white transition-colors"
            title="Interaction History"
          >
            <FiClock className="w-4 h-4" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-[#1C2027] rounded text-gray-400 hover:text-red-400 transition-colors"
            title="Clear Chat"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 hover:bg-[#1C2027] rounded text-gray-400 hover:text-white transition-colors"
            title={isMaximized ? "Restore Size" : "Maximize"}
          >
            {isMaximized ? (
              <FiMinimize2 className="w-4 h-4" />
            ) : (
              <FiMaximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2027] rounded text-gray-400 hover:text-white transition-colors"
            title="Close Panel"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0D0F12]">
        {showHistory ? (
          <HistoryTab history={history} onClose={() => setShowHistory(false)} />
        ) : (
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ask Me Anything
                </h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
                  Ask questions about your code, debug issues, explore algorithms, or get code explanations with Gemini.
                </p>
                <div className="text-left max-w-sm mx-auto space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Try asking:</p>
                  <button
                    onClick={() => setInput('Explain how Yjs CRDT handles concurrent conflicts in real-time editors')}
                    className="w-full text-left bg-[#1C2027] hover:bg-[#292E38] p-2.5 rounded-lg text-xs text-gray-300 transition-colors border border-[#292E38]"
                  >
                    💡 "Explain how Yjs CRDT handles concurrent conflicts"
                  </button>
                  <button
                    onClick={() => setInput('Write an optimized binary search function in JavaScript with types')}
                    className="w-full text-left bg-[#1C2027] hover:bg-[#292E38] p-2.5 rounded-lg text-xs text-gray-300 transition-colors border border-[#292E38]"
                  >
                    ⚡ "Write an optimized binary search function in JavaScript"
                  </button>
                  <button
                    onClick={() => setInput('How do I manage state cleanly with React Context and useReducer?')}
                    className="w-full text-left bg-[#1C2027] hover:bg-[#292E38] p-2.5 rounded-lg text-xs text-gray-300 transition-colors border border-[#292E38]"
                  >
                    🛠️ "How do I manage state cleanly with React Context?"
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-400 bg-[#1C2027] p-3 rounded-lg border border-[#292E38]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-vscode-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-vscode-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-vscode-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-vscode-accent font-medium">
                      Gemini is generating response...
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {!showHistory && (
        <InputArea
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
        />
      )}
    </motion.div>
  );
};

AIPanel.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default AIPanel;
