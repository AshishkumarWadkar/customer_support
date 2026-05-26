const { getPool } = require('../config/database');
const { getPagination, getOrderBy } = require('../utils/paginationUtils');

const ALLOWED_SORT_COLS = ['created_at', 'updated_at', 'priority', 'status', 'due_at', 'ticket_number'];

const buildFilterConditions = (query, userRole, userId) => {
  const conditions = ['t.deleted_at IS NULL'];
  const params = [];

  // Role-based scoping
  if (userRole === 'AGENT') {
    conditions.push('t.assigned_to = ?');
    params.push(userId);
  }

  if (query.status) { conditions.push('t.status = ?'); params.push(query.status); }
  if (query.priority) { conditions.push('t.priority = ?'); params.push(query.priority); }
  if (query.assignedTo) { conditions.push('t.assigned_to = ?'); params.push(query.assignedTo); }
  if (query.teamId) { conditions.push('t.team_id = ?'); params.push(query.teamId); }
  if (query.departmentId) { conditions.push('t.department_id = ?'); params.push(query.departmentId); }
  if (query.customerId) { conditions.push('t.customer_id = ?'); params.push(query.customerId); }
  if (query.dateFrom) { conditions.push('t.created_at >= ?'); params.push(query.dateFrom); }
  if (query.dateTo) { conditions.push('t.created_at <= ?'); params.push(query.dateTo + ' 23:59:59'); }
  if (query.search) {
    conditions.push('(t.subject LIKE ? OR t.ticket_number LIKE ? OR t.customer_name LIKE ?)');
    const s = `%${query.search}%`;
    params.push(s, s, s);
  }

  return { conditions, params };
};

const findAll = async (query, userRole, userId) => {
  const { page, limit, offset } = getPagination(query);
  const orderBy = getOrderBy(query, ALLOWED_SORT_COLS);
  const { conditions, params } = buildFilterConditions(query, userRole, userId);
  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.sla_status,
            t.customer_name, t.customer_email, t.created_at, t.updated_at, t.due_at,
            u.first_name AS agent_first, u.last_name AS agent_last,
            tm.name AS team_name
     FROM tickets t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN teams tm ON t.team_id = tm.id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM tickets t WHERE ${where}`,
    params
  );

  return { rows, total, page, limit };
};

const findById = async (id) => {
  const [rows] = await getPool().execute(
    `SELECT t.*,
            u.first_name AS agent_first, u.last_name AS agent_last, u.email AS agent_email,
            c.first_name AS cust_first, c.last_name AS cust_last,
            o.name AS org_name,
            d.name AS dept_name,
            tm.name AS team_name,
            ch.name AS channel_name,
            sp.name AS sla_policy_name
     FROM tickets t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN customers c ON t.customer_id = c.id
     LEFT JOIN organizations o ON t.organization_id = o.id
     LEFT JOIN departments d ON t.department_id = d.id
     LEFT JOIN teams tm ON t.team_id = tm.id
     LEFT JOIN channels ch ON t.channel_id = ch.id
     LEFT JOIN sla_policies sp ON t.sla_policy_id = sp.id
     WHERE t.id = ? AND t.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
};

const create = async (data) => {
  const {
    ticketNumber, customerId, customerEmail, customerName, organizationId,
    channelId, departmentId, teamId, assignedTo, slaPolicyId,
    subject, description, priority, category, subCategory, source, createdBy
  } = data;

  const [result] = await getPool().execute(
    `INSERT INTO tickets
     (ticket_number, customer_id, customer_email, customer_name, organization_id,
      channel_id, department_id, team_id, assigned_to, sla_policy_id,
      subject, description, priority, category, sub_category, source, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [ticketNumber, customerId || null, customerEmail, customerName, organizationId || null,
     channelId || null, departmentId || null, teamId || null, assignedTo || null, slaPolicyId || null,
     subject, description || null, priority || 'medium', category || null, subCategory || null,
     source || 'portal', createdBy || null]
  );
  return findById(result.insertId);
};

const update = async (id, fields, updatedBy) => {
  const allowed = ['status', 'priority', 'subject', 'description', 'assigned_to', 'team_id',
                   'department_id', 'category', 'sub_category', 'sla_policy_id', 'is_escalated',
                   'escalated_at', 'escalated_to', 'first_response_at', 'resolved_at', 'closed_at',
                   'due_at', 'frt_due_at', 'sla_status', 'csat_score', 'csat_comment'];
  const setClauses = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) { setClauses.push(`${key} = ?`); params.push(val); }
  }

  if (setClauses.length === 0) return findById(id);
  setClauses.push('updated_by = ?');
  params.push(updatedBy || null, id);

  await getPool().execute(`UPDATE tickets SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return findById(id);
};

const softDelete = async (id) => {
  await getPool().execute(`UPDATE tickets SET deleted_at = NOW() WHERE id = ?`, [id]);
};

// Comments
const addComment = async (data) => {
  const { ticketId, authorId, authorType, authorName, authorEmail, body, isInternal, isSystem, channel } = data;
  const [result] = await getPool().execute(
    `INSERT INTO ticket_comments (ticket_id, author_id, author_type, author_name, author_email, body, is_internal, is_system, channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ticketId, authorId || null, authorType || 'agent', authorName || null, authorEmail || null,
     body, isInternal ? 1 : 0, isSystem ? 1 : 0, channel || null]
  );
  const [rows] = await getPool().execute('SELECT * FROM ticket_comments WHERE id = ?', [result.insertId]);
  return rows[0];
};

const getComments = async (ticketId, includeInternal = true) => {
  const internalFilter = includeInternal ? '' : 'AND is_internal = 0';
  const [rows] = await getPool().execute(
    `SELECT tc.*, u.first_name, u.last_name, u.avatar_url
     FROM ticket_comments tc LEFT JOIN users u ON tc.author_id = u.id
     WHERE tc.ticket_id = ? AND tc.deleted_at IS NULL ${internalFilter}
     ORDER BY tc.created_at ASC`,
    [ticketId]
  );
  return rows;
};

// History
const addHistory = async (data) => {
  const { ticketId, changedBy, changedByName, fieldName, oldValue, newValue, changeType } = data;
  await getPool().execute(
    `INSERT INTO ticket_history (ticket_id, changed_by, changed_by_name, field_name, old_value, new_value, change_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticketId, changedBy || null, changedByName || null, fieldName, oldValue || null, newValue || null, changeType || 'update']
  );
};

const getHistory = async (ticketId) => {
  const [rows] = await getPool().execute(
    `SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY created_at ASC`,
    [ticketId]
  );
  return rows;
};

// Tags
const addTags = async (ticketId, tagIds, addedBy) => {
  if (!tagIds || tagIds.length === 0) return;
  const values = tagIds.map(() => '(?, ?, ?)').join(', ');
  const params = tagIds.flatMap((tagId) => [ticketId, tagId, addedBy || null]);
  await getPool().execute(
    `INSERT IGNORE INTO ticket_tags (ticket_id, tag_id, added_by) VALUES ${values}`,
    params
  );
};

const getTags = async (ticketId) => {
  const [rows] = await getPool().execute(
    `SELECT tg.id, tg.name, tg.color FROM ticket_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.ticket_id = ?`,
    [ticketId]
  );
  return rows;
};

const removeTags = async (ticketId, tagIds) => {
  if (!tagIds || tagIds.length === 0) return;
  const placeholders = tagIds.map(() => '?').join(', ');
  await getPool().execute(
    `DELETE FROM ticket_tags WHERE ticket_id = ? AND tag_id IN (${placeholders})`,
    [ticketId, ...tagIds]
  );
};

// Attachments
const addAttachment = async (data) => {
  const { ticketId, commentId, uploaderId, fileName, filePath, fileSize, mimeType } = data;
  const [result] = await getPool().execute(
    `INSERT INTO ticket_attachments (ticket_id, comment_id, uploader_id, file_name, file_path, file_size, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticketId, commentId || null, uploaderId || null, fileName, filePath, fileSize, mimeType]
  );
  const [rows] = await getPool().execute('SELECT * FROM ticket_attachments WHERE id = ?', [result.insertId]);
  return rows[0];
};

const getAttachments = async (ticketId) => {
  const [rows] = await getPool().execute(
    `SELECT * FROM ticket_attachments WHERE ticket_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
    [ticketId]
  );
  return rows;
};

// Counter for ticket number generation
const getTicketCountForToday = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `TKT-${today}-`;
  const [[{ count }]] = await getPool().execute(
    `SELECT COUNT(*) AS count FROM tickets WHERE ticket_number LIKE ?`,
    [`${prefix}%`]
  );
  return count;
};

module.exports = {
  findAll, findById, create, update, softDelete,
  addComment, getComments, addHistory, getHistory,
  addTags, getTags, removeTags,
  addAttachment, getAttachments,
  getTicketCountForToday,
};
