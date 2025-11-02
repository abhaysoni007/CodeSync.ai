/**
 * User Color Utilities
 * Shared color generation logic for consistent user colors across the application
 * 
 * @module userColorUtils
 */

// Highly distinct colors - carefully selected for maximum contrast
const USER_COLORS = [
  '#FF6B6B', // Bright Red
  '#4ECDC4', // Cyan
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#FF8C42', // Orange
  '#A8E6CF', // Mint
  '#FF6FB5', // Pink
  '#AA96DA', // Lavender
  '#F38181', // Coral
  '#95E1D3', // Aqua
  '#FCBAD3', // Rose
  '#A8D8EA', // Sky
  '#FFAAA7', // Peach
  '#C4E538', // Lime
  '#FF9CEE', // Magenta
  '#98DDCA', // Seafoam
  '#FFE66D', // Gold
  '#FF6F61', // Tomato
  '#38E54D', // Neon Green
  '#00D9FF', // Electric Blue
  '#FF5733', // Red Orange
  '#9D84B7', // Muted Purple
  '#FFB6B9', // Baby Pink
  '#6A0572', // Deep Purple
];

// Store color assignments to ensure consistency
const colorAssignments = new Map();
let colorIndex = 0;

/**
 * Generate consistent color from string (userId)
 * Uses sequential assignment for maximum color distinction
 * 
 * @param {string} str - User identifier string
 * @returns {string} Hex color code
 * 
 * @example
 * const color = generateColorFromString('user-123');
 * console.log(color); // '#FF6B6B' (first user gets first color)
 */
export const generateColorFromString = (str) => {
  if (!str) return '#666';
  
  // If already assigned, return that color
  if (colorAssignments.has(str)) {
    return colorAssignments.get(str);
  }
  
  // Assign next color in sequence
  const color = USER_COLORS[colorIndex % USER_COLORS.length];
  colorAssignments.set(str, color);
  colorIndex++;
  
  return color;
};

/**
 * Remove color assignment for a user (when they leave)
 * 
 * @param {string} str - User identifier string
 * 
 * @example
 * removeUserColor('user-123');
 */
export const removeUserColor = (str) => {
  colorAssignments.delete(str);
};

/**
 * Reset all color assignments
 * Useful when starting a new session
 * 
 * @example
 * resetColorAssignments();
 */
export const resetColorAssignments = () => {
  colorAssignments.clear();
  colorIndex = 0;
};

/**
 * Get initials from name (2 uppercase letters)
 * 
 * @param {string} name - User's full name
 * @returns {string} Two-character initials
 * 
 * @example
 * getInitials('John Doe'); // 'JD'
 * getInitials('Alice'); // 'AL'
 * getInitials(''); // '??'
 */
export const getInitials = (name) => {
  if (!name) return '??';
  
  const trimmedName = name.trim();
  const parts = trimmedName.split(' ').filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    // First letter of first word + first letter of last word
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  // Single word - take first 2 characters
  return trimmedName.substring(0, 2).toUpperCase();
};

export default {
  generateColorFromString,
  removeUserColor,
  resetColorAssignments,
  getInitials,
  USER_COLORS
};
