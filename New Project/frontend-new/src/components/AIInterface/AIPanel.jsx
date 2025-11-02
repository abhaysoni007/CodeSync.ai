import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAI } from '@/context/AIContext';
import ChatMessage from './ChatMessage';
import AgentLog from './AgentLog';
import InputArea from './InputArea';
import HistoryTab from './HistoryTab';
import PermissionModal from './PermissionModal';
import { FiX, FiMaximize2, FiMinimize2, FiTrash2, FiClock } from 'react-icons/fi';
import PropTypes from 'prop-types';

const AIPanel = ({ onClose }) => {
  const {
    mode,
    messages,
    isLoading,
    agentLogs,
    history,
    pendingPermissions,
    setPendingPermissions,
    clearMessages,
    askQuestion,
    executeAgentTask
  } = useAI();

  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentLogs]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');

    try {
      if (mode === 'ask') {
        await askQuestion(userInput);
      } else {
        await executeAgentTask(userInput);
      }
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
      className={`fixed right-0 top-0 h-screen bg-[#1e1e1e] border-l border-[#3c3c3c] shadow-2xl z-50 flex flex-col ${
        isMaximized ? 'w-full' : 'w-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">
            AI Assistant {mode === 'agent' && '🤖'}
          </h2>
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Processing...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-[#2d2d30] rounded transition-colors"
            title="History"
          >
            <FiClock className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-[#2d2d30] rounded transition-colors"
            title="Clear Chat"
          >
            <FiTrash2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 hover:bg-[#2d2d30] rounded transition-colors"
          >
            {isMaximized ? (
              <FiMinimize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <FiMaximize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2d2d30] rounded transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1e1e1e]">
        {showHistory ? (
          <HistoryTab history={history} onClose={() => setShowHistory(false)} />
        ) : (
          <div className="p-4 space-y-4">
            {messages.length === 0 && agentLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {mode === 'ask' ? '💬' : '🤖'}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {mode === 'ask' ? 'Ask Me Anything' : 'Agent Mode Active'}
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {mode === 'ask'
                    ? 'Ask questions about coding, get explanations, or request code examples.'
                    : 'Give me commands to generate code, create files, or build components automatically.'}
                </p>
                <div className="mt-6 text-left max-w-md mx-auto">
                  <p className="text-sm text-gray-500 mb-2">Examples:</p>
                  <div className="space-y-2">
                    {mode === 'ask' ? (
                      <>
                        <div className="bg-[#2d2d30] p-2 rounded text-sm text-gray-300">
                          "How do I create a React hook?"
                        </div>
                        <div className="bg-[#2d2d30] p-2 rounded text-sm text-gray-300">
                          "Explain async/await in JavaScript"
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-[#2d2d30] p-2 rounded text-sm text-gray-300">
                          "Create a landing page with hero section"
                        </div>
                        <div className="bg-[#2d2d30] p-2 rounded text-sm text-gray-300">
                          "Generate a login form component"
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Messages for Ask Mode */}
                {mode === 'ask' &&
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}

                {/* Logs for Agent Mode */}
                {mode === 'agent' && (
                  <>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {agentLogs.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Agent Logs
                        </h4>
                        {agentLogs.map((log, index) => (
                          <AgentLog key={index} log={log} />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">
                      {mode === 'ask' ? 'Thinking...' : 'Agent working...'}
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

      {/* Permission Modal */}
      <AnimatePresence>
        {pendingPermissions && pendingPermissions.length > 0 && (
          <PermissionModal
            permissions={pendingPermissions}
            onComplete={() => setPendingPermissions([])}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

AIPanel.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default AIPanel;
