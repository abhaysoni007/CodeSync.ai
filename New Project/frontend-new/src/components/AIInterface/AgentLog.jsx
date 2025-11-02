import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiXCircle, FiTerminal } from 'react-icons/fi';

const AgentLog = ({ log }) => {
  const getIcon = () => {
    switch (log.type) {
      case 'success':
        return <FiCheckCircle className="w-3 h-3 text-green-400" />;
      case 'error':
        return <FiXCircle className="w-3 h-3 text-red-400" />;
      case 'warning':
        return <FiAlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'terminal':
        return <FiTerminal className="w-3 h-3 text-purple-400" />;
      default:
        return <FiInfo className="w-3 h-3 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (log.type) {
      case 'success':
        return 'bg-green-900/20 border-green-900/50';
      case 'error':
        return 'bg-red-900/20 border-red-900/50';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-900/50';
      case 'terminal':
        return 'bg-purple-900/20 border-purple-900/50';
      default:
        return 'bg-blue-900/20 border-blue-900/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-2 p-2 rounded border ${getBgColor()} font-mono text-xs`}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <p className="text-gray-300">{log.message}</p>
        {log.details && (
          <p className="text-gray-500 mt-1 text-[10px]">{log.details}</p>
        )}
      </div>
      <span className="text-gray-600 text-[10px] flex-shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
    </motion.div>
  );
};

AgentLog.propTypes = {
  log: PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string.isRequired,
    details: PropTypes.string,
    timestamp: PropTypes.string.isRequired
  }).isRequired
};

export default AgentLog;
