const DOMPurify = require('isomorphic-dompurify');

/**
 * Remove markup from user-controlled strings while preserving plain text.
 *
 * @param {unknown} value Potential user input.
 * @param {number} maxLength Maximum accepted string length.
 * @returns {string} Sanitized text.
 */
function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a list of short tag-like strings.
 *
 * @param {unknown} values Potential array input.
 * @returns {string[]} Sanitized unique tags.
 */
function sanitizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const sanitized = [];

  values.forEach((value) => {
    const item = sanitizeString(value, 32).toLowerCase();
    if (item && !seen.has(item)) {
      seen.add(item);
      sanitized.push(item);
    }
  });

  return sanitized.slice(0, 12);
}

module.exports = {
  sanitizeString,
  sanitizeStringArray,
};
