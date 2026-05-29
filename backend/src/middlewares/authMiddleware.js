const { verifyAccessToken } = require('../utils/jwtUtils');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * CSRF PROTECTION NOTE
 * --------------------
 * This application uses a hybrid JWT strategy that is inherently CSRF-safe:
 *
 *   • Access token  — sent by the client in the `Authorization: Bearer <token>`
 *     request header (stored in localStorage, injected by the Axios interceptor).
 *     Browsers enforce the Same-Origin Policy for custom headers, so a
 *     cross-site page can never forge this header. No csurf middleware is needed.
 *
 *   • Refresh token — stored in an HttpOnly cookie with `sameSite: 'strict'`.
 *     The SameSite attribute prevents the browser from attaching the cookie on
 *     any cross-origin request, providing defence-in-depth for the one endpoint
 *     (/auth/refresh) that reads from a cookie.
 *
 * References:
 *   OWASP CSRF Prevention – https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 *   "Using JWT in Authorization Headers" section: custom headers are CSRF-safe by design.
 */

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
