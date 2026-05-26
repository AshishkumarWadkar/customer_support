const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Role-Based Access Control middleware
 * @param {string[]} allowedRoles - Array of role names that can access the route
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to perform this action',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

module.exports = { authorize };
