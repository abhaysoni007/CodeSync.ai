import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import sunIcon from '/icons/icons/setting.svg'; // Using settings as sun placeholder
import moonIcon from '/icons/icons/setting.svg'; // Using settings as moon placeholder

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/80 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <FaCode className="text-cyan-400 text-2xl" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              CodeSync.ai
            </span>
          </motion.div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-300 hover:text-cyan-400 transition-colors">
              Home
            </a>
            <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-cyan-400 transition-colors">
              Pricing
            </a>
            <a href="#contact" className="text-gray-300 hover:text-cyan-400 transition-colors">
              Contact
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Toggle theme"
            >
              <Icon 
                src={theme === 'dark' ? sunIcon : moonIcon}
                alt="Toggle theme"
                className="w-5 h-5"
                themed={true}
              />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Login
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-semibold shadow-lg"
            >
              Signup
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
