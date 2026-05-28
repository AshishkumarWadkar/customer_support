const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Middleware that blocks all requests (except change-password and logout)
 * when the authenticated user's JWT contains mustChangePassword = true.
 *
 * This middleware must be used AFTER authenticate() so that req.user is set.
 *
 * Allowed endpoints while flag is active:
 *   PUT  /auth/change-password
 *   POST /auth/logout
 *   GET  /auth/me
 */
const mustChangePassword = (req, res, next) => {
  if (!req.user || !req.user.mustChangePassword) {
    return next();
  }

  const { method, path } = req;

  // Allow the endpoints needed to actually change the password or sign out
  const allowed =
    (method === 'PUT'  && path === '/change-password') ||
    (method === 'POST' && path === '/logout') ||
    (method === 'GET'  && path === '/me');

  if (allowed) {
    return next();
  }

  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message: 'You must change your password before continuing',
    code: 'MUST_CHANGE_PASSWORD',
  });
};

module.exports = { mustChangePassword };
