import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiSend, FiChevronDown, FiCpu } from 'react-icons/fi';
import { useAI } from '@/context/AIContext';

const InputArea = ({ input, setInput, onSubmit, onKeyPress, isLoading }) => {
  const { model, switchModel } = useAI();
  const textareaRef = useRef(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentModel = models.find(m => m.id === model) || models[0];

  return (
    <div className="border-t border-[#292E38] bg-[#15181D]">
      {/* Input Area */}
      <div className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="Ask a coding question, request explanation, or debug code..."
              disabled={isLoading}
              className="w-full bg-[#0D0F12] text-gray-200 border border-[#292E38] rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:border-[#E8A855] focus:ring-1 focus:ring-[#E8A855] disabled:opacity-50 disabled:cursor-not-allowed custom-scrollbar text-sm"
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
                ? 'bg-[#E8A855] hover:bg-[#F0BE7A] text-[#14110A]'
                : 'bg-[#1C2027] text-gray-600 cursor-not-allowed'
            }`}
            whileHover={input.trim() && !isLoading ? { scale: 1.05 } : {}}
            whileTap={input.trim() && !isLoading ? { scale: 0.95 } : {}}
            title="Send (Enter)"
          >
            <FiSend className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-[#292E38]/50 pt-2">
        {/* Left: Mode Badge */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <FiCpu className="w-3.5 h-3.5 text-vscode-accent" />
          <span className="font-medium text-gray-300">Ask Mode</span>
        </div>

        {/* Right: Model Selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModelDropdown(!showModelDropdown);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1C2027] hover:bg-[#292E38] rounded-lg text-xs text-gray-300 transition-colors border border-[#292E38]"
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
                className="absolute bottom-full right-0 mb-2 bg-[#15181D] border border-[#292E38] rounded-lg shadow-2xl overflow-hidden min-w-[220px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      switchModel(m.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left hover:bg-[#1C2027] transition-colors ${
                      model === m.id ? 'bg-[#E8A855]/10 border-l-2 border-[#E8A855]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-gray-200">{m.label}</div>
                        <div className="text-[10px] text-gray-500">{m.desc}</div>
                      </div>
                      {model === m.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
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
      <div className="px-4 pb-2.5 text-[11px] text-gray-500 flex items-center justify-between">
        <span>
          {isLoading ? (
            <span className="text-vscode-accent animate-pulse">Generating answer with Gemini...</span>
          ) : (
            'Enter to send • Shift+Enter for new line'
          )}
        </span>
        <span className="text-gray-600">Powered by Google Gemini</span>
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
