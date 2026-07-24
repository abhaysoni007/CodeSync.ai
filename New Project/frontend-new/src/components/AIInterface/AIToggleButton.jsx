import { motion } from 'framer-motion';
import { FiCpu } from 'react-icons/fi';
import { useAI } from '@/context/AIContext';

const AIToggleButton = () => {
  const { isPanelOpen, togglePanel } = useAI();

  return (
    <motion.button
      onClick={togglePanel}
      className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all z-40 ${
        isPanelOpen
          ? 'bg-gray-700 hover:bg-gray-600'
          : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={isPanelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
    >
      <motion.div
        animate={{ rotate: isPanelOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <FiCpu className="w-6 h-6 text-white" />
      </motion.div>
      
      {/* Pulse animation when closed */}
      {!isPanelOpen && (
        <motion.div
          className="absolute inset-0 rounded-full bg-vscode-accent"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      )}
    </motion.button>
  );
};

export default AIToggleButton;
