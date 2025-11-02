import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiSend, FiChevronDown } from 'react-icons/fi';
import { useAI } from '@/context/AIContext';

const InputArea = ({ input, setInput, onSubmit, onKeyPress, isLoading }) => {
  const { mode, switchMode, model, switchModel } = useAI();
  const textareaRef = useRef(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const modes = [
    { id: 'ask', label: '💬 Ask Mode', desc: 'Q&A Assistant' },
    { id: 'agent', label: '🤖 Agent Mode', desc: 'Code Generator' }
  ];

  const models = [
    { id: 'gemini-2.0-flash-exp', label: '⚡ Gemini 2.0 Flash', desc: 'Ultra-fast responses' },
    { id: 'gemini-1.5-pro', label: '🧠 Gemini 1.5 Pro', desc: 'Advanced reasoning' }
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModeDropdown(false);
      setShowModelDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentMode = modes.find(m => m.id === mode) || modes[0];
  const currentModel = models.find(m => m.id === model) || models[0];

  return (
    <div className="border-t border-[#3c3c3c] bg-[#252526]">
      {/* Input Area */}
      <div className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={
                mode === 'ask'
                  ? 'Ask a question...'
                  : 'Enter command (e.g., "Create a navbar component")...'
              }
              disabled={isLoading}
              className="w-full bg-[#1e1e1e] text-gray-200 border border-[#3c3c3c] rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:border-[#0e639c] focus:ring-1 focus:ring-[#0e639c] disabled:opacity-50 disabled:cursor-not-allowed custom-scrollbar"
              rows={1}
              style={{ maxHeight: '150px' }}
            />
            
            {/* Blinking cursor when loading */}
            {isLoading && (
              <motion.div
                className="absolute right-4 top-3 text-gray-400"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                |
              </motion.div>
            )}
          </div>

          <motion.button
            onClick={onSubmit}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-lg transition-all ${
              input.trim() && !isLoading
                ? 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
                : 'bg-[#2d2d30] text-gray-600 cursor-not-allowed'
            }`}
            whileHover={input.trim() && !isLoading ? { scale: 1.05 } : {}}
            whileTap={input.trim() && !isLoading ? { scale: 0.95 } : {}}
          >
            <FiSend className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-[#3c3c3c]/50 pt-2">
        {/* Left: Mode Selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModeDropdown(!showModeDropdown);
              setShowModelDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d30] hover:bg-[#3c3c3c] rounded-lg text-sm text-gray-300 transition-colors"
          >
            <span>{currentMode.label}</span>
            <FiChevronDown className={`w-3 h-3 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Mode Dropdown */}
          <AnimatePresence>
            {showModeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 mb-2 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden min-w-[200px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      switchMode(m.id);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-[#2d2d30] transition-colors ${
                      mode === m.id ? 'bg-[#0e639c]/20 border-l-2 border-[#0e639c]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{m.label}</div>
                        <div className="text-xs text-gray-500">{m.desc}</div>
                      </div>
                      {mode === m.id && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Model Selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModelDropdown(!showModelDropdown);
              setShowModeDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d30] hover:bg-[#3c3c3c] rounded-lg text-sm text-gray-300 transition-colors"
          >
            <span>{currentModel.label}</span>
            <FiChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Dropdown */}
          <AnimatePresence>
            {showModelDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full right-0 mb-2 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden min-w-[240px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      switchModel(m.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-[#2d2d30] transition-colors ${
                      model === m.id ? 'bg-[#0e639c]/20 border-l-2 border-[#0e639c]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{m.label}</div>
                        <div className="text-xs text-gray-500">{m.desc}</div>
                      </div>
                      {model === m.id && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status Text */}
      <div className="px-4 pb-3 text-xs text-gray-500 flex items-center justify-between">
        <span>
          {isLoading ? (
            <span className="text-blue-400 animate-pulse">Processing with Gemini...</span>
          ) : (
            'Press Enter to send, Shift+Enter for new line'
          )}
        </span>
        <span className="flex items-center gap-2">
          {mode === 'agent' && !isLoading && (
            <span className="text-yellow-500">⚡ Auto-generates files</span>
          )}
          <span className="text-gray-600">• Powered by Google Gemini</span>
        </span>
      </div>
    </div>
  );
};

InputArea.propTypes = {
  input: PropTypes.string.isRequired,
  setInput: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired
};

export default InputArea;
