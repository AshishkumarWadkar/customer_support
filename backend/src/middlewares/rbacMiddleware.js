const { HTTP_STATUS } = require('../constants/httpStatus');
const { getPool } = require('../config/database');

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

/**
 * Permission-based access control middleware.
 * Checks that the authenticated user's role has the given permission name
 * by querying role_permissions → permissions in the database.
 * Results are cached on req.userPermissions for the lifetime of the request.
 *
 * @param {string} permissionName - e.g. 'kb.publish', 'kb.create'
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    try {
      // Cache permissions for this request to avoid repeated DB hits
      if (!req.userPermissions) {
        const [rows] = await getPool().execute(
          `SELECT p.name
           FROM role_permissions rp
           JOIN roles r ON rp.role_id = r.id
           JOIN permissions p ON rp.permission_id = p.id
           WHERE r.name = ?`,
          [req.user.role]
        );
        req.userPermissions = new Set(rows.map((r) => r.name));
      }

      if (!req.userPermissions.has(permissionName)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Permission '${permissionName}' is required to perform this action`,
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authorize, requirePermission };
