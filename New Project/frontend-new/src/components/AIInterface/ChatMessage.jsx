import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiUser, FiCpu, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isAgent = message.role === 'agent';

  const getIcon = () => {
    if (isUser) return <FiUser className="w-4 h-4" />;
    if (isError) return <FiAlertCircle className="w-4 h-4 text-red-400" />;
    if (isAgent) return <FiCheckCircle className="w-4 h-4 text-green-400" />;
    return <FiCpu className="w-4 h-4 text-blue-400" />;
  };

  const getBgColor = () => {
    if (isUser) return 'bg-[#2d2d30]';
    if (isError) return 'bg-red-900/20 border border-red-900/50';
    if (isAgent) return 'bg-green-900/20 border border-green-900/50';
    return 'bg-[#1e1e1e] border border-[#3c3c3c]';
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
              {isUser ? 'You' : isAgent ? 'Agent' : 'AI Assistant'}
            </span>
            <span className="text-xs text-gray-600">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="prose prose-invert prose-sm max-w-none">
            {isUser || isError ? (
              <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-2"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-[#2d2d30] px-1.5 py-0.5 rounded text-sm text-blue-300" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="text-gray-200 mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-gray-200 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-gray-200 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-200">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold text-white mb-2">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Metadata */}
          {message.metadata && (
            <div className="mt-3 pt-3 border-t border-[#3c3c3c] text-xs text-gray-500">
              {message.metadata.filesCreated && (
                <div className="mb-1">
                  <span className="font-semibold">Files Created:</span>{' '}
                  {message.metadata.filesCreated.join(', ')}
                </div>
              )}
              {message.metadata.provider && (
                <div>
                  Provider: {message.metadata.provider} | Model: {message.metadata.model}
                  {message.metadata.tokens && ` | Tokens: ${message.metadata.tokens}`}
                </div>
              )}
            </div>
          )}
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
