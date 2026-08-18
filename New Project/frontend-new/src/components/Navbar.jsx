import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/button';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 ${
        isScrolled ? 'bg-land-ink/95 border-land-line' : 'bg-transparent border-transparent'
      }`}
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md border border-land-line bg-land-surface text-land-accent">
            <Terminal className="w-4 h-4" />
          </span>
          <span className="font-mono text-lg font-bold text-land-paper">
            CodeSync<span className="text-land-accent">.ai</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-xs uppercase tracking-wider text-land-muted hover:text-land-paper transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-land-muted hover:text-land-paper hover:bg-land-surface transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Button variant="ghost" className="text-land-muted hover:text-land-paper" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button
            className="bg-land-accent text-land-ink font-semibold hover:bg-land-accentHover"
            onClick={() => navigate('/register')}
          >
            Sign up
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
