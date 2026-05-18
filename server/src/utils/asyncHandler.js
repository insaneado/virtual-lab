/**
 * Wrap async Express handlers so failures flow into the centralized error handler.
 *
 * @param {Function} fn Express route handler.
 * @returns {Function} Error-forwarding route handler.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
