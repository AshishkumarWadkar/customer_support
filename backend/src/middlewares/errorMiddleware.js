const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = null, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, 'VALIDATION_ERROR', errors);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Centralized Express error handler — must be the LAST middleware
 */
const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId || 'unknown';

  if (err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      requestId,
      path: req.path,
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors || undefined,
    });
  }

  // Unexpected errors — log stack trace
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
    code: 'INTERNAL_ERROR',
  });
};

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ConflictError,
};
