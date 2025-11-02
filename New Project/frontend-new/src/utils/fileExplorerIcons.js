/**
 * Enhanced File Icons Utility
 * Provides file-type specific icons with theme support
 */

// Import folder icons (theme-dependent)
import folderIcon from '/icons/icons/folder.svg';

// Import file type icons (static color)
import jsIcon from '/icons/icons/files/js-svgrepo-com.svg';
import pyIcon from '/icons/icons/files/python-svgrepo-com.svg';
import htmlIcon from '/icons/icons/files/html-svgrepo-com.svg';
import cssIcon from '/icons/icons/files/css-3-svgrepo-com.svg';
import txtIcon from '/icons/icons/files/text-file.svg';
import cIcon from '/icons/icons/files/c-lang.svg';
import cppIcon from '/icons/icons/files/c-plus-plus-svgrepo-com.svg';
import csharpIcon from '/icons/icons/files/c-sharp-svgrepo-com.svg';
import javaIcon from '/icons/icons/files/java-svgrepo-com.svg';
import phpIcon from '/icons/icons/files/php2-svgrepo-com.svg';
import sqlIcon from '/icons/icons/files/sql-database-generic-svgrepo-com.svg';
import reactIcon from '/icons/icons/files/react-svgrepo-com.svg';
import tsIcon from '/icons/icons/files/typescript-svgrepo-com.svg';
import jsonIcon from '/icons/icons/json.svg';
import xmlIcon from '/icons/icons/files/xml-document-svgrepo-com.svg';
import dbIcon from '/icons/icons/files/database-svgrepo-com.svg';
import imageIcon from '/icons/icons/files/image-svgrepo-com.svg';
import mp3Icon from '/icons/icons/files/mp3-svgrepo-com.svg';
import mp4Icon from '/icons/icons/files/mp4-document-svgrepo-com.svg';
import wavIcon from '/icons/icons/files/wav-svgrepo-com.svg';

/**
 * File icon mapping by extension
 * Icons are static (don't change with theme)
 */
const fileIconMap = {
  // JavaScript & TypeScript
  js: jsIcon,
  jsx: reactIcon,
  ts: tsIcon,
  tsx: reactIcon,
  mjs: jsIcon,
  cjs: jsIcon,
  
  // Python
  py: pyIcon,
  pyc: pyIcon,
  pyd: pyIcon,
  
  // Web
  html: htmlIcon,
  htm: htmlIcon,
  css: cssIcon,
  scss: cssIcon,
  sass: cssIcon,
  less: cssIcon,
  
  // C family
  c: cIcon,
  h: cIcon,
  cpp: cppIcon,
  'c++': cppIcon,
  cc: cppIcon,
  cxx: cppIcon,
  hpp: cppIcon,
  cs: csharpIcon,
  
  // Java
  java: javaIcon,
  jar: javaIcon,
  class: javaIcon,
  
  // PHP
  php: phpIcon,
  phtml: phpIcon,
  
  // Data & Config
  json: jsonIcon,
  json5: jsonIcon,
  jsonc: jsonIcon,
  xml: xmlIcon,
  sql: sqlIcon,
  db: dbIcon,
  sqlite: dbIcon,
  sqlite3: dbIcon,
  yml: txtIcon,
  yaml: txtIcon,
  toml: txtIcon,
  ini: txtIcon,
  env: txtIcon,
  
  // Text & Markdown
  txt: txtIcon,
  md: txtIcon,
  markdown: txtIcon,
  log: txtIcon,
  
  // Images
  png: imageIcon,
  jpg: imageIcon,
  jpeg: imageIcon,
  gif: imageIcon,
  svg: imageIcon,
  webp: imageIcon,
  bmp: imageIcon,
  ico: imageIcon,
  
  // Audio
  mp3: mp3Icon,
  wav: wavIcon,
  ogg: mp3Icon,
  flac: mp3Icon,
  
  // Video
  mp4: mp4Icon,
  avi: mp4Icon,
  mkv: mp4Icon,
  mov: mp4Icon,
  webm: mp4Icon,
};

/**
 * Get file icon based on extension
 * File icons don't change with theme
 * @param {string} filename - The filename or extension
 * @returns {string} - The icon path
 */
export const getFileIcon = (filename) => {
  if (!filename) return txtIcon;
  
  // Extract extension
  const ext = filename.includes('.') 
    ? filename.split('.').pop().toLowerCase()
    : filename.toLowerCase();
  
  // Return mapped icon or default
  return fileIconMap[ext] || txtIcon;
};

/**
 * Get folder icon with theme support
 * @param {string} theme - 'light' or 'dark'
 * @param {boolean} isExpanded - Whether folder is expanded
 * @returns {string} - The folder icon path
 */
export const getFolderIcon = (theme = 'dark', isExpanded = false) => {
  // For now, we'll use the same icon for all states
  // You can add open/closed folder icons later
  return folderIcon;
};

/**
 * Get icon style based on theme
 * Folder icons change color, file icons don't
 * @param {string} type - 'file' or 'folder'
 * @param {string} theme - 'light' or 'dark'
 * @returns {Object} - Style object
 */
export const getIconStyle = (type, theme = 'dark') => {
  if (type === 'folder') {
    // Folder icons change with theme
    return {
      filter: theme === 'light' 
        ? 'brightness(0) saturate(100%)' // Black for light theme
        : 'brightness(0) saturate(100%) invert(1)', // White for dark theme
      transition: 'filter 0.2s ease'
    };
  }
  
  // File icons keep their original colors
  return {
    filter: 'none'
  };
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - The extension
 */
export const getFileExtension = (filename) => {
  if (!filename || !filename.includes('.')) return '';
  return filename.split('.').pop().toLowerCase();
};

/**
 * Check if file is an image
 * @param {string} filename - The filename
 * @returns {boolean}
 */
export const isImageFile = (filename) => {
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
};

/**
 * Check if file is a code file
 * @param {string} filename - The filename
 * @returns {boolean}
 */
export const isCodeFile = (filename) => {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php',
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'sql'
  ];
  const ext = getFileExtension(filename);
  return codeExtensions.includes(ext);
};

/**
 * Check if file is a media file
 * @param {string} filename - The filename
 * @returns {boolean}
 */
export const isMediaFile = (filename) => {
  const mediaExtensions = [
    'mp3', 'wav', 'ogg', 'flac', // Audio
    'mp4', 'avi', 'mkv', 'mov', 'webm' // Video
  ];
  const ext = getFileExtension(filename);
  return mediaExtensions.includes(ext);
};

/**
 * Get file type label
 * @param {string} filename - The filename
 * @returns {string} - Human-readable file type
 */
export const getFileTypeLabel = (filename) => {
  const ext = getFileExtension(filename);
  
  const typeLabels = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    py: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    xml: 'XML',
    sql: 'SQL',
    md: 'Markdown',
    txt: 'Text',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    gif: 'GIF Image',
    svg: 'SVG Image',
    mp3: 'MP3 Audio',
    wav: 'WAV Audio',
    mp4: 'MP4 Video',
  };
  
  return typeLabels[ext] || ext.toUpperCase() + ' File';
};

export default {
  getFileIcon,
  getFolderIcon,
  getIconStyle,
  getFileExtension,
  isImageFile,
  isCodeFile,
  isMediaFile,
  getFileTypeLabel
};
