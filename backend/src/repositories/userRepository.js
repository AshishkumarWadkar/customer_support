const { getPool } = require('../config/database');
const { getPagination, getOrderBy } = require('../utils/paginationUtils');

const ALLOWED_SORT_COLS = ['first_name', 'last_name', 'email', 'created_at', 'last_login_at'];

const findByEmail = async (email) => {
  const [rows] = await getPool().execute(
    `SELECT u.*, r.name AS role_name FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND u.deleted_at IS NULL`,
    [email]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await getPool().execute(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            u.timezone, u.locale, u.is_active, u.is_locked, u.last_login_at,
            u.department_id, u.must_change_password, u.email_verified,
            r.name AS role, r.id AS role_id
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
};

const findAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const orderBy = getOrderBy(query, ALLOWED_SORT_COLS);
  const params = [];
  const conditions = ['u.deleted_at IS NULL'];

  if (query.role) { conditions.push('r.name = ?'); params.push(query.role); }
  if (query.departmentId) { conditions.push('u.department_id = ?'); params.push(query.departmentId); }
  if (query.search) {
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    const s = `%${query.search}%`;
    params.push(s, s, s);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, u.is_locked,
            u.last_login_at, u.created_at, r.name AS role, d.name AS department
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id WHERE ${where}`,
    params
  );

  return { rows, total, page, limit };
};

/**
 * Lightweight agent list for assignment dropdowns.
 * Returns all active AGENT and MANAGER users with their open-ticket workload count.
 */
const findAgents = async ({ teamId, search } = {}) => {
  const conditions = [
    'u.deleted_at IS NULL',
    'u.is_active = 1',
    "r.name IN ('AGENT', 'MANAGER', 'SUPER_ADMIN')",
  ];
  const params = [];

  if (teamId) {
    conditions.push('EXISTS (SELECT 1 FROM agent_teams at WHERE at.user_id = u.id AND at.team_id = ?)');
    params.push(teamId);
  }
  if (search) {
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       u.avatar_url,
       r.name AS role,
       d.name AS department,
       COALESCE(aa.status, 'offline') AS availability,
       (SELECT COUNT(*) FROM tickets t
        WHERE t.assigned_to = u.id
          AND t.status NOT IN ('resolved','closed')
          AND t.deleted_at IS NULL) AS open_ticket_count
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN agent_availability aa ON aa.user_id = u.id
     WHERE ${where}
     ORDER BY u.first_name ASC, u.last_name ASC`,
    params
  );

  return rows;
};

const create = async (data) => {
  const { firstName, lastName, email, passwordHash, roleId, departmentId, phone, createdBy } = data;
  const [result] = await getPool().execute(
    `INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, phone, created_by, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [firstName, lastName, email, passwordHash, roleId, departmentId || null, phone || null, createdBy || null]
  );
  return findById(result.insertId);
};

const update = async (id, fields) => {
  const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'timezone', 'locale', 'department_id', 'is_active', 'must_change_password', 'updated_by'];
  const setClauses = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) { setClauses.push(`${key} = ?`); params.push(val); }
  }

  if (setClauses.length === 0) return findById(id);
  params.push(id);
  await getPool().execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return findById(id);
};

const updateLoginInfo = async (id, ip) => {
  await getPool().execute(
    `UPDATE users SET last_login_at = NOW(), last_login_ip = ?, failed_login_attempts = 0 WHERE id = ?`,
    [ip, id]
  );
};

const incrementFailedAttempts = async (id) => {
  await getPool().execute(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?`,
    [id]
  );
};

const lockAccount = async (id, lockUntil) => {
  await getPool().execute(
    `UPDATE users SET is_locked = 1, locked_until = ? WHERE id = ?`,
    [lockUntil, id]
  );
};

const unlockAccount = async (id) => {
  await getPool().execute(
    `UPDATE users SET is_locked = 0, locked_until = NULL, failed_login_attempts = 0 WHERE id = ?`,
    [id]
  );
};

const softDelete = async (id) => {
  await getPool().execute(`UPDATE users SET deleted_at = NOW() WHERE id = ?`, [id]);
};

const updatePassword = async (id, passwordHash) => {
  await getPool().execute(
    `UPDATE users SET password_hash = ?, password_changed_at = NOW(), must_change_password = 0 WHERE id = ?`,
    [passwordHash, id]
  );
};

const getPasswordHistory = async (userId, limit = 5) => {
  const [rows] = await getPool().execute(
    `SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows.map((r) => r.password_hash);
};

const savePasswordHistory = async (userId, passwordHash) => {
  await getPool().execute(
    `INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)`,
    [userId, passwordHash]
  );
};

module.exports = {
  findByEmail, findById, findAll, findAgents, create, update,
  updateLoginInfo, incrementFailedAttempts, lockAccount, unlockAccount,
  softDelete, updatePassword, getPasswordHistory, savePasswordHistory,
};
