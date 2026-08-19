import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiUser, FiCpu, FiAlertCircle, FiCopy, FiCheck } from 'react-icons/fi';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessage = ({ message }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getIcon = () => {
    if (isUser) return <FiUser className="w-4 h-4 text-gray-300" />;
    if (isError) return <FiAlertCircle className="w-4 h-4 text-red-400" />;
    return <FiCpu className="w-4 h-4 text-vscode-accent" />;
  };

  const getBgColor = () => {
    if (isUser) return 'bg-[#1C2027] border border-[#292E38]/50';
    if (isError) return 'bg-red-900/20 border border-red-900/50';
    return 'bg-[#0D0F12] border border-[#292E38]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg ${getBgColor()}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-400">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs text-gray-600">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {message.metadata?.model && (
              <span className="text-[10px] bg-[#1C2027] text-gray-400 px-2 py-0.5 rounded">
                {message.metadata.model}
              </span>
            )}
          </div>
          
          <div className="prose prose-invert prose-sm max-w-none">
            {isUser || isError ? (
              <p className="text-gray-200 whitespace-pre-wrap text-sm">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const codeIndex = Math.random();

                    return !inline && match ? (
                      <div className="relative group my-3">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#15181D] border border-b-0 border-[#292E38] rounded-t-md text-xs text-gray-400">
                          <span>{match[1]}</span>
                          <button
                            onClick={() => handleCopyCode(codeString, codeIndex)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            {copiedIndex === codeIndex ? (
                              <>
                                <FiCheck className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-[10px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <FiCopy className="w-3 h-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderTopLeftRadius: 0,
                            borderTopRightRadius: 0,
                            border: '1px solid #292E38',
                            backgroundColor: '#0A0C10',
                            fontSize: '12px'
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-[#1C2027] text-[#E8A855] px-1.5 py-0.5 rounded text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    metadata: PropTypes.object
  }).isRequired
};

export default ChatMessage;
