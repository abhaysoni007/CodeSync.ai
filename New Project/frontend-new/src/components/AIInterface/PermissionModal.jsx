import { useState } from 'prop-types';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { FiTerminal, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';

/**
 * Permission Request Modal
 * Shows when agent wants to run terminal commands
 */
const PermissionModal = ({ permissions, onApprove, onDeny, onComplete }) => {
  const [executing, setExecuting] = useState(null);
  const [results, setResults] = useState({});

  const handleApprove = async (permission, index) => {
    setExecuting(index);
    
    try {
      const response = await api.post('/ai/agent/approve', {
        action: permission,
        projectRoot: './projects'
      });

      setResults(prev => ({
        ...prev,
        [index]: { success: true, output: response.data.result }
      }));

      toast.success('Command executed successfully!');
      
      if (onApprove) {
        onApprove(permission, response.data);
      }

    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Command failed';
      setResults(prev => ({
        ...prev,
        [index]: { success: false, error: errorMsg }
      }));
      toast.error(errorMsg);
    } finally {
      setExecuting(null);
    }
  };

  const handleDeny = (permission, index) => {
    setResults(prev => ({
      ...prev,
      [index]: { success: false, denied: true }
    }));
    toast('Command denied', { icon: '🚫' });
    
    if (onDeny) {
      onDeny(permission);
    }
  };

  const allProcessed = permissions.every((_, idx) => results[idx]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => allProcessed && onComplete && onComplete()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3c3c3c] flex items-center justify-between bg-[#252526]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <FiAlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-200">Permission Required</h3>
              <p className="text-sm text-gray-500">Agent wants to execute {permissions.length} command(s)</p>
            </div>
          </div>
          {allProcessed && (
            <button
              onClick={() => onComplete && onComplete()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Permission List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {permissions.map((permission, index) => {
            const result = results[index];
            const isExecuting = executing === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-[#252526] border rounded-lg overflow-hidden ${
                  result?.success ? 'border-green-500/50' :
                  result?.denied ? 'border-gray-600' :
                  result?.success === false ? 'border-red-500/50' :
                  'border-[#3c3c3c]'
                }`}
              >
                {/* Permission Info */}
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                      result?.success ? 'bg-green-500/20' :
                      result?.denied ? 'bg-gray-700' :
                      result?.success === false ? 'bg-red-500/20' :
                      'bg-[#0e639c]/20'
                    }`}>
                      {result?.success ? (
                        <FiCheck className="w-4 h-4 text-green-500" />
                      ) : result?.denied ? (
                        <FiX className="w-4 h-4 text-gray-500" />
                      ) : result?.success === false ? (
                        <FiX className="w-4 h-4 text-red-500" />
                      ) : (
                        <FiTerminal className="w-4 h-4 text-[#0e639c]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-300 mb-1">
                        Terminal Command
                      </div>
                      <code className="text-xs text-blue-400 bg-[#1e1e1e] px-2 py-1 rounded block overflow-x-auto custom-scrollbar">
                        {permission.target}
                      </code>
                      <div className="text-xs text-gray-500 mt-2">
                        <strong>Reason:</strong> {permission.reason}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!result && (
                    <div className="flex gap-2 mt-4">
                      <motion.button
                        onClick={() => handleApprove(permission, index)}
                        disabled={isExecuting}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isExecuting ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            Executing...
                          </>
                        ) : (
                          <>
                            <FiCheck className="w-4 h-4" />
                            Approve & Run
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeny(permission, index)}
                        disabled={isExecuting}
                        className="flex-1 px-4 py-2 bg-[#2d2d30] hover:bg-[#3c3c3c] text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiX className="w-4 h-4" />
                        Deny
                      </motion.button>
                    </div>
                  )}

                  {/* Result Output */}
                  {result && (
                    <div className="mt-4">
                      {result.denied ? (
                        <div className="text-sm text-gray-500 italic">Command denied by user</div>
                      ) : result.success ? (
                        <div>
                          <div className="text-sm text-green-500 font-medium mb-2">✓ Executed successfully</div>
                          {result.output?.output && (
                            <pre className="text-xs text-gray-400 bg-[#1e1e1e] p-2 rounded overflow-x-auto custom-scrollbar max-h-32">
                              {result.output.output}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-red-400">
                          ✗ Failed: {result.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        {allProcessed && (
          <div className="px-6 py-4 border-t border-[#3c3c3c] bg-[#252526]">
            <motion.button
              onClick={() => onComplete && onComplete()}
              className="w-full px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded-lg font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

PermissionModal.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.shape({
    action: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    reason: PropTypes.string.isRequired,
    content: PropTypes.string
  })).isRequired,
  onApprove: PropTypes.func,
  onDeny: PropTypes.func,
  onComplete: PropTypes.func
};

export default PermissionModal;
