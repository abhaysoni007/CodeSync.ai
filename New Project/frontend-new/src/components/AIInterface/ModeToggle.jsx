import { motion } from 'framer-motion';
import { useAI } from '@/context/AIContext';
import { FiMessageSquare, FiCpu } from 'react-icons/fi';

const ModeToggle = () => {
  const { mode, switchMode } = useAI();

  return (
    <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526]">
      <div className="flex gap-2 p-1 bg-[#1e1e1e] rounded-lg">
        <motion.button
          onClick={() => switchMode('ask')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'ask'
              ? 'bg-[#0e639c] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2d2d30]'
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
              ? 'bg-[#0e639c] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2d2d30]'
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
