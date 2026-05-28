const adminService = require('../services/adminService');
const { sendSuccess, sendPaginated } = require('../utils/responseUtils');
const { ValidationError } = require('../middlewares/errorMiddleware');

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * List all platform users with their current role.
 * Query: search, role, page, limit, sort, order
 */
const listUsers = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await adminService.listUsers(req.query);
    return sendPaginated(res, rows, page, limit, total, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Roles ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/roles
 * Return all predefined roles.
 */
const listRoles = async (req, res, next) => {
  try {
    const roles = await adminService.listRoles();
    return sendSuccess(res, roles, 'Roles retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Single assign / revoke ───────────────────────────────────────────────────

/**
 * POST /api/v1/admin/users/:id/roles/assign
 * Body: { role: 'MANAGER' }
 */
const assignRole = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!role) throw new ValidationError('role is required');

    const outcome = await adminService.assignRole(targetUserId, role, req.user);

    if (outcome.skipped) {
      return sendSuccess(res, null, outcome.reason);
    }

    return sendSuccess(res, null, `Role '${role}' assigned successfully`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/users/:id/roles/revoke
 * Body: { role: 'MANAGER' }
 */
const revokeRole = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!role) throw new ValidationError('role is required');

    const outcome = await adminService.revokeRole(targetUserId, role, req.user);

    if (outcome.skipped) {
      return sendSuccess(res, null, outcome.reason);
    }

    return sendSuccess(res, null, `Role '${role}' revoked successfully`);
  } catch (err) {
    next(err);
  }
};

// ─── Bulk operations ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/roles/bulk-assign
 * Body: { userIds: [1,2,3], role: 'AGENT' }
 */
const bulkAssignRole = async (req, res, next) => {
  try {
    const { userIds, role } = req.body;

    if (!role) throw new ValidationError('role is required');
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ValidationError('userIds must be a non-empty array');
    }

    const results = await adminService.bulkAssignRole(userIds, role, req.user);
    const successCount = results.filter((r) => r.status === 'success').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const errorCount   = results.filter((r) => r.status === 'error').length;

    return sendSuccess(
      res,
      { results, summary: { successCount, skippedCount, errorCount } },
      `Bulk assign complete: ${successCount} assigned, ${skippedCount} skipped, ${errorCount} failed`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/roles/bulk-revoke
 * Body: { userIds: [1,2,3], role: 'AGENT' }
 */
const bulkRevokeRole = async (req, res, next) => {
  try {
    const { userIds, role } = req.body;

    if (!role) throw new ValidationError('role is required');
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ValidationError('userIds must be a non-empty array');
    }

    const results = await adminService.bulkRevokeRole(userIds, role, req.user);
    const successCount = results.filter((r) => r.status === 'success').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const errorCount   = results.filter((r) => r.status === 'error').length;

    return sendSuccess(
      res,
      { results, summary: { successCount, skippedCount, errorCount } },
      `Bulk revoke complete: ${successCount} revoked, ${skippedCount} skipped, ${errorCount} failed`
    );
  } catch (err) {
    next(err);
  }
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/audit-logs
 * Query: page, limit, targetUserId, performedBy, dateFrom, dateTo, eventType
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await adminService.getAuditLogs(req.query);
    return sendPaginated(res, rows, page, limit, total, 'Audit logs retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  listRoles,
  assignRole,
  revokeRole,
  bulkAssignRole,
  bulkRevokeRole,
  getAuditLogs,
};
