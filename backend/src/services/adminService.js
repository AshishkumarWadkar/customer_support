const adminRepo = require('../repositories/adminRepository');
const userRepo  = require('../repositories/userRepository');
const { emitRoleUpdated } = require('../config/socket');
const { AUDIT_EVENTS } = require('../constants/auditEvents');
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} = require('../middlewares/errorMiddleware');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a role object from the DB; throw 422 if not found.
 */
const resolveRole = async (roleName) => {
  const role = await adminRepo.findRoleByName(roleName);
  if (!role) {
    throw new ValidationError(`Role '${roleName}' does not exist in the system`);
  }
  return role;
};

/**
 * Verify that the target user exists and return its DB record.
 */
const resolveUser = async (userId) => {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User');
  return user;
};

// ─── List ─────────────────────────────────────────────────────────────────────

const listUsers = async (query) => {
  return adminRepo.findAllUsers(query);
};

const listRoles = async () => {
  return adminRepo.getAllRoles();
};

// ─── Single assign / revoke ───────────────────────────────────────────────────

/**
 * Assign `roleName` to `targetUserId`.
 * Returns { skipped: true } if user already has that role.
 */
const assignRole = async (targetUserId, roleName, adminUser) => {
  const role   = await resolveRole(roleName);
  const target = await resolveUser(targetUserId);

  // Already holds this role?
  if (target.role === roleName) {
    return { skipped: true, reason: `User already has the '${roleName}' role` };
  }

  await adminRepo.assignRole(targetUserId, role.id);

  // Audit log
  await adminRepo.writeAuditLog({
    eventType:    AUDIT_EVENTS.ROLE_ASSIGNED,
    performedBy:  adminUser.id,
    targetUserId: targetUserId,
    metadata:     { role: roleName, previousRole: target.role },
  });

  // Notify target user's active session(s) in real time
  emitRoleUpdated(targetUserId, { role: roleName });

  return { skipped: false };
};

/**
 * Revoke `roleName` from `targetUserId` — i.e., reassign them to CUSTOMER role
 * unless roleName === their current role. Revoking means downgrading to CUSTOMER.
 *
 * Business rules:
 *  - Cannot revoke your own SUPER_ADMIN role.
 *  - Cannot revoke the last SUPER_ADMIN in the system.
 *  - If the user does not currently hold that role → informational skip.
 */
const revokeRole = async (targetUserId, roleName, adminUser) => {
  const role   = await resolveRole(roleName);
  const target = await resolveUser(targetUserId);

  // Does user actually hold this role?
  if (target.role !== roleName) {
    return { skipped: true, reason: `User does not have the '${roleName}' role` };
  }

  // Self-revoke of SUPER_ADMIN guard
  if (roleName === 'SUPER_ADMIN' && targetUserId === adminUser.id) {
    throw new ForbiddenError(
      'You cannot revoke your own administrator role to prevent accidental lockout'
    );
  }

  // Last admin guard
  if (roleName === 'SUPER_ADMIN') {
    const adminCount = await adminRepo.countAdmins();
    if (adminCount <= 1) {
      throw new ForbiddenError(
        'Cannot revoke the last administrator role. At least one active administrator must exist at all times'
      );
    }
  }

  // Downgrade to CUSTOMER (the "no-role" baseline)
  const customerRole = await adminRepo.findRoleByName('CUSTOMER');
  if (!customerRole) throw new ValidationError('CUSTOMER role not configured in system');

  await adminRepo.assignRole(targetUserId, customerRole.id);

  // Audit log
  await adminRepo.writeAuditLog({
    eventType:    AUDIT_EVENTS.ROLE_REVOKED,
    performedBy:  adminUser.id,
    targetUserId: targetUserId,
    metadata:     { role: roleName, newRole: 'CUSTOMER' },
  });

  // Notify target user's active session(s) in real time
  emitRoleUpdated(targetUserId, { role: 'CUSTOMER' });

  return { skipped: false };
};

// ─── Bulk operations ──────────────────────────────────────────────────────────

/**
 * Bulk-assign `roleName` to every userId in `userIds`.
 * Returns { results: [{userId, status, reason?}] }
 */
const bulkAssignRole = async (userIds, roleName, adminUser) => {
  // Validate role once up front
  await resolveRole(roleName);

  const results = [];
  for (const userId of userIds) {
    try {
      const outcome = await assignRole(userId, roleName, adminUser);
      results.push({
        userId,
        status: outcome.skipped ? 'skipped' : 'success',
        reason: outcome.reason,
      });
    } catch (err) {
      results.push({ userId, status: 'error', reason: err.message });
    }
  }
  return results;
};

/**
 * Bulk-revoke `roleName` from every userId in `userIds`.
 */
const bulkRevokeRole = async (userIds, roleName, adminUser) => {
  await resolveRole(roleName);

  const results = [];
  for (const userId of userIds) {
    try {
      const outcome = await revokeRole(userId, roleName, adminUser);
      results.push({
        userId,
        status: outcome.skipped ? 'skipped' : 'success',
        reason: outcome.reason,
      });
    } catch (err) {
      results.push({ userId, status: 'error', reason: err.message });
    }
  }
  return results;
};

// ─── Audit log ────────────────────────────────────────────────────────────────

const getAuditLogs = async (query) => {
  return adminRepo.getAuditLogs(query);
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
