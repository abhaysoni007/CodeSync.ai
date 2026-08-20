import { motion } from 'framer-motion';
import { useAI } from '@/context/AIContext';
import { FiMessageSquare, FiCpu } from 'react-icons/fi';

const ModeToggle = () => {
  const { mode, switchMode } = useAI();

  return (
    <div className="px-4 py-3 border-b border-vscode-border bg-vscode-sidebar">
      <div className="flex gap-2 p-1 bg-vscode-bg rounded-lg">
        <motion.button
          onClick={() => switchMode('ask')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'ask'
              ? 'bg-vscode-accent text-vscode-bg shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-vscode-panel'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiMessageSquare className="w-4 h-4" />
          Ask Mode
        </motion.button>

        <motion.button
          onClick={() => switchMode('agent')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'agent'
              ? 'bg-vscode-accent text-vscode-bg shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-vscode-panel'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiCpu className="w-4 h-4" />
          Agent Mode
        </motion.button>
      </div>
    </div>
  );
};

export default ModeToggle;
