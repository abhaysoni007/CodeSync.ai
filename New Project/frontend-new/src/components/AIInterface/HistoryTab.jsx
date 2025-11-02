import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiMessageSquare, FiCpu, FiX, FiFileText } from 'react-icons/fi';

const HistoryTab = ({ history, onClose }) => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">History</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#2d2d30] rounded transition-colors"
        >
          <FiX className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No history yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history
            .slice()
            .reverse()
            .map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2d2d30] p-3 rounded-lg border border-[#3c3c3c] hover:border-[#0e639c] transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {item.mode === 'ask' ? (
                      <FiMessageSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <FiCpu className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-400 uppercase">
                        {item.mode} Mode
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      {item.prompt || item.command}
                    </p>
                    {item.mode === 'agent' && item.files && item.files.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <FiFileText className="w-3 h-3" />
                        <span>{item.files.length} file(s) created</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
};

HistoryTab.propTypes = {
  history: PropTypes.arrayOf(
    PropTypes.shape({
      mode: PropTypes.string.isRequired,
      prompt: PropTypes.string,
      command: PropTypes.string,
      timestamp: PropTypes.string.isRequired,
      files: PropTypes.array
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired
};

export default HistoryTab;
