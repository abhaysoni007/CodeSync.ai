import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiMessageSquare, FiX } from 'react-icons/fi';

const HistoryTab = ({ history, onClose }) => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Ask Mode History</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#1C2027] rounded text-gray-400 hover:text-white transition-colors"
          title="Back to Chat"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No questions asked yet</p>
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
                className="bg-[#1C2027] p-3 rounded-lg border border-[#292E38] hover:border-[#E8A855] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <FiMessageSquare className="w-4 h-4 text-vscode-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-gray-400">
                        {item.model || 'Gemini'}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium line-clamp-2">
                      {item.prompt}
                    </p>
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
  history: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired
};

export default HistoryTab;
