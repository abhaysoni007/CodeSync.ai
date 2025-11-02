/**
 * Throttle and Debounce Utilities
 * For smooth, efficient updates without jitter
 * 
 * @module throttleUtils
 */

/**
 * Throttle - Executes function at most once per specified time period
 * Perfect for cursor position updates to prevent network flooding
 * 
 * @param {Function} func - Function to throttle
 * @param {number} delay - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 * 
 * @example
 * const throttledUpdate = throttle((position) => {
 *   socket.emit('cursor-update', position);
 * }, 100);
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  let timeoutId = null;

  return function throttled(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    } else {
      // Schedule one final call
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
};

/**
 * Debounce - Delays execution until after a specified time has elapsed
 * Perfect for typing indicators and search inputs
 * 
 * @param {Function} func - Function to debounce
 * @param {number} delay - Time to wait before execution in milliseconds
 * @returns {Function} Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   performSearch(query);
 * }, 300);
 */
export const debounce = (func, delay) => {
  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Leading throttle - Executes immediately, then throttles
 * Good for immediate feedback with throttled updates
 * 
 * @param {Function} func - Function to throttle
 * @param {number} delay - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export const throttleLeading = (func, delay) => {
  let lastCall = 0;

  return function throttled(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

/**
 * Request Animation Frame throttle
 * Perfect for visual updates synchronized with browser repaints
 * 
 * @param {Function} func - Function to throttle
 * @returns {Function} RAF-throttled function
 */
export const rafThrottle = (func) => {
  let rafId = null;
  let lastArgs = null;

  return function throttled(...args) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, lastArgs);
        rafId = null;
      });
    }
  };
};

export default {
  throttle,
  debounce,
  throttleLeading,
  rafThrottle
};
