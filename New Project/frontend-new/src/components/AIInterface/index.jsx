import { AnimatePresence } from 'framer-motion';
import { useAI } from '@/context/AIContext';
import AIPanel from './AIPanel';

const AIInterface = () => {
  const { isPanelOpen, togglePanel } = useAI();

  return (
    <AnimatePresence>
      {isPanelOpen && <AIPanel onClose={togglePanel} />}
    </AnimatePresence>
  );
};

export default AIInterface;
