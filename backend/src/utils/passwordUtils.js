const { ValidationError } = require('../middlewares/errorMiddleware');

const PASSWORD_MIN_LENGTH = 8;
// Requires at least: one lowercase, one uppercase, one digit, one special char
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

/**
 * Validate password complexity.
 * Throws ValidationError if requirements are not met.
 * @param {string} password
 */
const validatePasswordComplexity = (password) => {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new ValidationError(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    );
  }
};

module.exports = { validatePasswordComplexity };
