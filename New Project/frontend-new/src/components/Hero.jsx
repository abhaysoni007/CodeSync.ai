import { motion } from 'framer-motion';
import { FaRocket, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import TypingAnimation from './TypingAnimation';

const Hero = ({ onGetStartedClick, onLoginClick }) => {
  const navigate = useNavigate();
  
  const typingTexts = [
    "Real-time AI-powered code collaboration platform.",
    "Bring your team, your code, and your AI — all in one place.",
    "Code together. Ship faster. Build better."
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000" />
        
        {/* Animated code lines */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 opacity-10"
        >
          <pre className="text-cyan-400 text-sm font-mono">
            {`const collaborate = async () => {
  const team = await connectTeam();
  const ai = await initializeAI(['GPT', 'Claude', 'Gemini']);
  return realTimeSync(team, ai);
};`}
          </pre>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-6 text-center"
      >
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent"
        >
          Collaborate. Code. Create
          <br />
          <span className="text-cyan-400">— Together.</span>
        </motion.h1>

        <motion.div
          variants={itemVariants}
          className="text-xl md:text-2xl text-gray-300 mb-8 h-8 md:h-10 flex items-center justify-center"
        >
          <TypingAnimation texts={typingTexts} typingSpeed={80} deletingSpeed={40} pauseTime={3000} />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto"
        >
          Experience the future of collaborative coding with real-time editing, 
          integrated AI assistants, and seamless team communication.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-bold text-lg flex items-center gap-2 shadow-xl"
          >
            <FaRocket />
            Get Started
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 rounded-lg font-bold text-lg flex items-center gap-2 hover:bg-cyan-400/10 transition-colors"
          >
            Login
            <FaArrowRight />
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { number: '10K+', label: 'Active Users' },
            { number: '50K+', label: 'Projects Created' },
            { number: '99.9%', label: 'Uptime' },
            { number: '24/7', label: 'Support' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{stat.number}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-cyan-400 rounded-full flex justify-center">
          <div className="w-1.5 h-2 bg-cyan-400 rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
