const { verifyAccessToken } = require('../utils/jwtUtils');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Verify JWT access token and attach user to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Optional authentication — does not fail if no token, just attaches user if present
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = verifyAccessToken(token);
    }
  } catch (_) {
    // ignore auth errors for optional routes
  }
  next();
};

module.exports = { authenticate, optionalAuth };
