import PropTypes from 'prop-types';
import { getFileIcon, getFileExtension } from '../utils/fileIcons';

/**
 * File Icon component - Displays file-specific icons without theme filtering
 * File icons maintain their original colors in both light and dark mode
 * 
 * @param {string} filename - The filename to display icon for
 * @param {string} className - Additional CSS classes
 */
const FileIcon = ({ filename, className = 'w-5 h-5' }) => {
  const iconSrc = getFileIcon(filename);
  const extension = getFileExtension(filename);
  
  return (
    <img 
      src={iconSrc} 
      alt={`${extension} file`}
      className={className}
      title={filename}
    />
  );
};

FileIcon.propTypes = {
  filename: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default FileIcon;
