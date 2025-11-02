import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Theme-aware Icon component
 * @param {string} src - Icon source path
 * @param {string} alt - Alt text for accessibility
 * @param {string} className - Additional CSS classes
 * @param {boolean} themed - Whether to apply theme-aware filtering (default: true)
 * @param {boolean} animated - Whether to add hover animation (default: true)
 */
const Icon = ({ 
  src, 
  alt = 'icon', 
  className = 'w-6 h-6', 
  themed = true,
  animated = true,
  onClick
}) => {
  const iconClasses = `${className} ${themed ? 'icon-theme' : ''}`.trim();

  if (animated) {
    return (
      <motion.img
        whileHover={{ scale: 1.1, rotate: 3 }}
        transition={{ duration: 0.2 }}
        src={src}
        alt={alt}
        className={iconClasses}
        onClick={onClick}
      />
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={iconClasses}
      onClick={onClick}
    />
  );
};

Icon.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  themed: PropTypes.bool,
  animated: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Icon;
