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

// ── Ticket Links ─────────────────────────────────────────────────────────────

/**
 * Create a link between two tickets.
 * Inserts one row per direction so both sides appear when we query by ticket_id.
 */
const addLink = async (ticketId, linkedTicketId, linkType, createdBy) => {
  const pool = getPool();

  // Prevent self-linking
  if (Number(ticketId) === Number(linkedTicketId)) {
    throw new Error('A ticket cannot be linked to itself');
  }

  // Prevent duplicate links in either direction
  const [[existing]] = await pool.execute(
    `SELECT id FROM ticket_links
     WHERE (ticket_id = ? AND linked_ticket_id = ?)
        OR (ticket_id = ? AND linked_ticket_id = ?)
     LIMIT 1`,
    [ticketId, linkedTicketId, linkedTicketId, ticketId]
  );
  if (existing) {
    throw new Error('These tickets are already linked');
  }

  // Determine the inverse relationship type
  const inverseMap = {
    related:    'related',
    duplicate:  'duplicate',
    parent:     'child',
    child:      'parent',
    blocked_by: 'blocks',
    blocks:     'blocked_by',
  };
  const inverseLinkType = inverseMap[linkType] || 'related';

  // Insert both directions atomically
  await pool.execute(
    `INSERT INTO ticket_links (ticket_id, linked_ticket_id, link_type, created_by)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
    [ticketId, linkedTicketId, linkType, createdBy || null,
     linkedTicketId, ticketId, inverseLinkType, createdBy || null]
  );

  return getLinks(ticketId);
};

/**
 * Return all links for a ticket with full linked-ticket details.
 */
const getLinks = async (ticketId) => {
  const [rows] = await getPool().execute(
    `SELECT
       tl.id,
       tl.link_type,
       tl.created_by,
       tl.created_at,
       t.id            AS linked_ticket_id,
       t.ticket_number AS linked_ticket_number,
       t.subject       AS linked_ticket_subject,
       t.status        AS linked_ticket_status,
       t.priority      AS linked_ticket_priority,
       u.first_name    AS linked_agent_first,
       u.last_name     AS linked_agent_last
     FROM ticket_links tl
     JOIN tickets t ON t.id = tl.linked_ticket_id AND t.deleted_at IS NULL
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE tl.ticket_id = ?
     ORDER BY tl.created_at ASC`,
    [ticketId]
  );
  return rows;
};

/**
 * Remove a link by its ID.
 * Deletes BOTH directions (the row in each ticket's perspective).
 */
const removeLink = async (linkId, ticketId) => {
  const pool = getPool();

  // Find the link row to get both ticket IDs
  const [[link]] = await pool.execute(
    `SELECT ticket_id, linked_ticket_id FROM ticket_links WHERE id = ?`,
    [linkId]
  );
  if (!link) throw new Error('Link not found');

  // Verify the requesting ticket is one side of this link
  const { ticket_id: tA, linked_ticket_id: tB } = link;
  if (Number(tA) !== Number(ticketId) && Number(tB) !== Number(ticketId)) {
    throw new Error('Link does not belong to this ticket');
  }

  // Delete both directional rows
  await pool.execute(
    `DELETE FROM ticket_links
     WHERE (ticket_id = ? AND linked_ticket_id = ?)
        OR (ticket_id = ? AND linked_ticket_id = ?)`,
    [tA, tB, tB, tA]
  );
};

/**
 * Full-text search on tickets for the "link ticket" live-search dropdown.
 * Searches ticket_number, subject, customer_name, and assignee name.
 * Excludes the current ticket and already-linked tickets.
 */
const searchForLinking = async (query, excludeTicketId) => {
  if (!query || query.trim().length < 2) return [];

  const s = `%${query.trim()}%`;

  // Get IDs already linked to excludeTicketId so we can exclude them
  const [linkedRows] = await getPool().execute(
    `SELECT linked_ticket_id FROM ticket_links WHERE ticket_id = ?`,
    [excludeTicketId]
  );
  const excludedIds = [Number(excludeTicketId), ...linkedRows.map((r) => r.linked_ticket_id)];
  const placeholders = excludedIds.map(() => '?').join(', ');

  const [rows] = await getPool().execute(
    `SELECT
       t.id,
       t.ticket_number,
       t.subject,
       t.status,
       t.priority,
       u.first_name AS agent_first,
       u.last_name  AS agent_last
     FROM tickets t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.deleted_at IS NULL
       AND t.id NOT IN (${placeholders})
       AND (
         t.ticket_number LIKE ?
         OR t.subject     LIKE ?
         OR t.customer_name LIKE ?
         OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
       )
     ORDER BY t.created_at DESC
     LIMIT 15`,
    [...excludedIds, s, s, s, s]
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
  addLink, getLinks, removeLink, searchForLinking,
  getTicketCountForToday,
};
