// File: utils/helpers.js

// Generate SEO-friendly slug from string
export const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Get pagination parameters
export const getPaginationParams = (page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  return {
    limit: limitNum,
    offset,
    page: pageNum
  };
};

// Format date to readable string
export const formatDate = (date, format = 'full') => {
  const d = new Date(date);
  
  if (format === 'full') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } else if (format === 'time') {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toISOString();
};

// Generate random string (for tokens, etc.)
export const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Remove HTML tags from string
export const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
};

// Convert object to query string
export const objectToQueryString = (obj) => {
  const params = new URLSearchParams();
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      params.append(key, obj[key]);
    }
  });
  
  return params.toString();
};

// Parse query string to object
export const queryStringToObject = (queryString) => {
  const params = new URLSearchParams(queryString);
  const obj = {};
  
  for (const [key, value] of params) {
    obj[key] = value;
  }
  
  return obj;
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = {
    isValid: false,
    score: 0,
    messages: []
  };
  
  if (password.length < minLength) {
    strength.messages.push(`Password must be at least ${minLength} characters long`);
  } else {
    strength.score += 1;
  }
  
  if (!hasUpperCase) {
    strength.messages.push('Password must contain at least one uppercase letter');
  } else {
    strength.score += 1;
  }
  
  if (!hasLowerCase) {
    strength.messages.push('Password must contain at least one lowercase letter');
  } else {
    strength.score += 1;
  }
  
  if (!hasNumbers) {
    strength.messages.push('Password must contain at least one number');
  } else {
    strength.score += 1;
  }
  
  if (!hasSpecialChar) {
    strength.messages.push('Password must contain at least one special character');
  } else {
    strength.score += 1;
  }
  
  strength.isValid = strength.score >= 4;
  
  return strength;
};

// Calculate reading time
export const calculateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  if (minutes === 1) {
    return '1 min read';
  }
  
  return `${minutes} min read`;
};

// Convert file size to human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Check if object is empty
export const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

// Get environment variable with default
export const getEnvVar = (key, defaultValue = '') => {
  return process.env[key] || defaultValue;
};