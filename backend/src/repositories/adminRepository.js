const { getPool } = require('../config/database');
const { getPagination, getOrderBy } = require('../utils/paginationUtils');

const ALLOWED_USER_SORT = ['first_name', 'last_name', 'email', 'created_at'];

/**
 * Return every role row from the roles table.
 */
const getAllRoles = async () => {
  const [rows] = await getPool().execute('SELECT id, name FROM roles ORDER BY id ASC');
  return rows;
};

/**
 * Find a role by its name (case-sensitive).
 */
const findRoleByName = async (name) => {
  const [rows] = await getPool().execute('SELECT id, name FROM roles WHERE name = ?', [name]);
  return rows[0] || null;
};

/**
 * Find a role by its primary key.
 */
const findRoleById = async (id) => {
  const [rows] = await getPool().execute('SELECT id, name FROM roles WHERE id = ?', [id]);
  return rows[0] || null;
};

/**
 * Paginated list of all users with their current role.
 * Supports search (name/email) and role filter.
 */
const findAllUsers = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const orderBy = getOrderBy(query, ALLOWED_USER_SORT);
  const params = [];
  const conditions = ['u.deleted_at IS NULL'];

  if (query.role) {
    conditions.push('r.name = ?');
    params.push(query.role);
  }
  if (query.search) {
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    const s = `%${query.search}%`;
    params.push(s, s, s);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.is_locked,
            u.last_login_at, u.created_at, r.name AS role, r.id AS role_id
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE ${where}`,
    params
  );

  return { rows, total, page, limit };
};

/**
 * Assign a role to a user by updating role_id.
 */
const assignRole = async (userId, roleId) => {
  await getPool().execute('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
};

/**
 * Return the role_id currently held by a user.
 */
const getUserRoleId = async (userId) => {
  const [rows] = await getPool().execute(
    'SELECT role_id FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  return rows[0]?.role_id ?? null;
};

/**
 * Count how many active (non-deleted) users have the SUPER_ADMIN role.
 */
const countAdmins = async () => {
  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE r.name = 'SUPER_ADMIN' AND u.deleted_at IS NULL AND u.is_active = 1`
  );
  return total;
};

/**
 * Insert one row into the audit_logs table.
 * @param {object} opts
 * @param {string}  opts.eventType     - AUDIT_EVENTS constant
 * @param {number}  opts.performedBy   - admin user id
 * @param {number}  opts.targetUserId  - affected user id
 * @param {object}  opts.metadata      - JSON-serializable detail object
 */
const writeAuditLog = async ({ eventType, performedBy, targetUserId, metadata }) => {
  await getPool().execute(
    `INSERT INTO audit_logs (event_type, performed_by, target_user_id, metadata, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [eventType, performedBy, targetUserId, JSON.stringify(metadata)]
  );
};

/**
 * Paginated audit log query for role events.
 * Filters: dateFrom, dateTo, targetUserId, performedBy, eventType (comma-separated)
 */
const getAuditLogs = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const params = [];
  const conditions = ["al.event_type IN ('ROLE_ASSIGNED','ROLE_REVOKED')"];

  if (query.eventType) {
    const types = query.eventType.split(',').map((t) => t.trim());
    conditions.push(`al.event_type IN (${types.map(() => '?').join(',')})`);
    params.push(...types);
  }
  if (query.targetUserId) {
    conditions.push('al.target_user_id = ?');
    params.push(query.targetUserId);
  }
  if (query.performedBy) {
    conditions.push('al.performed_by = ?');
    params.push(query.performedBy);
  }
  if (query.dateFrom) {
    conditions.push('al.created_at >= ?');
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    conditions.push('al.created_at <= ?');
    params.push(query.dateTo);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT
       al.id, al.event_type, al.metadata, al.created_at,
       tu.id AS target_id,
       CONCAT(tu.first_name, ' ', tu.last_name) AS target_name,
       tu.email AS target_email,
       au.id AS admin_id,
       CONCAT(au.first_name, ' ', au.last_name) AS admin_name,
       au.email AS admin_email
     FROM audit_logs al
     LEFT JOIN users tu ON al.target_user_id = tu.id
     LEFT JOIN users au ON al.performed_by = au.id
     WHERE ${where}
     ORDER BY al.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM audit_logs al WHERE ${where}`,
    params
  );

  return { rows, total, page, limit };
};

module.exports = {
  getAllRoles,
  findRoleByName,
  findRoleById,
  findAllUsers,
  assignRole,
  getUserRoleId,
  countAdmins,
  writeAuditLog,
  getAuditLogs,
};
