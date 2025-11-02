// Import file icons
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

// File icon mapping
const fileIconMap = {
  // JavaScript & TypeScript
  js: jsIcon,
  jsx: reactIcon,
  ts: tsIcon,
  tsx: reactIcon,
  
  // Python
  py: pyIcon,
  
  // Web
  html: htmlIcon,
  htm: htmlIcon,
  css: cssIcon,
  scss: cssIcon,
  sass: cssIcon,
  
  // C family
  c: cIcon,
  cpp: cppIcon,
  'c++': cppIcon,
  cc: cppIcon,
  cs: csharpIcon,
  
  // Java
  java: javaIcon,
  
  // PHP
  php: phpIcon,
  
  // Data
  json: jsonIcon,
  xml: xmlIcon,
  sql: sqlIcon,
  db: dbIcon,
  sqlite: dbIcon,
  
  // Text
  txt: txtIcon,
  md: txtIcon,
  
  // Images
  png: imageIcon,
  jpg: imageIcon,
  jpeg: imageIcon,
  gif: imageIcon,
  svg: imageIcon,
  webp: imageIcon,
  
  // Audio
  mp3: mp3Icon,
  wav: wavIcon,
  
  // Video
  mp4: mp4Icon,
  avi: mp4Icon,
  mkv: mp4Icon,
};

/**
 * Get file icon based on extension
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
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - The extension
 */
export const getFileExtension = (filename) => {
  if (!filename || !filename.includes('.')) return '';
  return filename.split('.').pop().toLowerCase();
};

export default getFileIcon;
