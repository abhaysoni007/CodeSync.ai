/**
 * Time utilities for delta scheduling
 */

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Create idle timer
 */
export function createIdleTimer(callback, idleTime) {
  let timer;
  
  const reset = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(callback, idleTime);
  };
  
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  
  return { reset, cancel };
}

/**
 * Create interval timer with pause/resume
 */
export function createIntervalTimer(callback, interval) {
  let timerId = null;
  let isPaused = false;
  
  const start = () => {
    if (!timerId && !isPaused) {
      timerId = setInterval(callback, interval);
    }
  };
  
  const pause = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      isPaused = true;
    }
  };
  
  const resume = () => {
    if (isPaused) {
      isPaused = false;
      start();
    }
  };
  
  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    isPaused = false;
  };
  
  return { start, pause, resume, stop };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Format as date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate time elapsed
 */
export function getTimeElapsed(start, end = Date.now()) {
  const elapsed = end - start;
  
  return {
    milliseconds: elapsed,
    seconds: Math.floor(elapsed / 1000),
    minutes: Math.floor(elapsed / 60000),
    hours: Math.floor(elapsed / 3600000)
  };
}

/**
 * Schedule with exponential backoff
 */
export function scheduleWithBackoff(callback, baseDelay = 1000, maxDelay = 60000, attempt = 0) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  return setTimeout(() => {
    callback(attempt);
  }, delay);
}

/**
 * Batch operations with time window
 */
export function createBatcher(callback, windowMs = 200) {
  let batch = [];
  let timer = null;
  
  const flush = () => {
    if (batch.length > 0) {
      callback([...batch]);
      batch = [];
    }
    timer = null;
  };
  
  const add = (item) => {
    batch.push(item);
    
    if (!timer) {
      timer = setTimeout(flush, windowMs);
    }
  };
  
  const forceFlush = () => {
    if (timer) {
      clearTimeout(timer);
    }
    flush();
  };
  
  return { add, flush: forceFlush };
}
