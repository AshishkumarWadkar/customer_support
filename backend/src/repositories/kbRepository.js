const { getPool } = require('../config/database');
const { getPagination, getOrderBy } = require('../utils/paginationUtils');

const ALLOWED_SORT_COLS = ['created_at', 'updated_at', 'title', 'status', 'version'];

// ─── Article queries ───────────────────────────────────────────────────────

const findAll = async (query, includeNonPublished = false) => {
  const { page, limit, offset } = getPagination(query);
  const orderBy = getOrderBy(query, ALLOWED_SORT_COLS);

  const conditions = ['a.deleted_at IS NULL'];
  const params = [];

  if (!includeNonPublished) {
    conditions.push("a.status = 'published'");
  }

  if (query.status) { conditions.push('a.status = ?'); params.push(query.status); }
  if (query.categoryId) { conditions.push('a.category_id = ?'); params.push(query.categoryId); }
  if (query.isPublic !== undefined) { conditions.push('a.is_public = ?'); params.push(query.isPublic ? 1 : 0); }
  if (query.search) {
    conditions.push('(a.title LIKE ? OR a.excerpt LIKE ?)');
    const s = `%${query.search}%`;
    params.push(s, s);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute(
    `SELECT a.id, a.title, a.slug, a.excerpt, a.status, a.is_public,
            a.version, a.view_count, a.helpful_count, a.not_helpful_count,
            a.published_at, a.reviewed_at, a.created_at, a.updated_at,
            c.name AS category_name,
            cb.first_name AS created_by_first, cb.last_name AS created_by_last,
            rv.first_name AS reviewer_first, rv.last_name AS reviewer_last
     FROM kb_articles a
     LEFT JOIN kb_categories c ON a.category_id = c.id
     LEFT JOIN users cb ON a.created_by = cb.id
     LEFT JOIN users rv ON a.reviewed_by = rv.id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM kb_articles a WHERE ${where}`,
    params
  );

  return { rows, total, page, limit };
};

const findById = async (id) => {
  const [rows] = await getPool().execute(
    `SELECT a.*,
            c.name AS category_name,
            cb.first_name AS created_by_first, cb.last_name AS created_by_last,
            ub.first_name AS updated_by_first, ub.last_name AS updated_by_last,
            rv.first_name AS reviewer_first, rv.last_name AS reviewer_last,
            rv.email AS reviewer_email
     FROM kb_articles a
     LEFT JOIN kb_categories c ON a.category_id = c.id
     LEFT JOIN users cb ON a.created_by = cb.id
     LEFT JOIN users ub ON a.updated_by = ub.id
     LEFT JOIN users rv ON a.reviewed_by = rv.id
     WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
};

const create = async (data) => {
  const { categoryId, title, slug, body, excerpt, isPublic, createdBy } = data;

  const [result] = await getPool().execute(
    `INSERT INTO kb_articles
     (category_id, title, slug, body, excerpt, status, is_public, version, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, 1, ?, ?)`,
    [
      categoryId || null,
      title,
      slug,
      body,
      excerpt || null,
      isPublic !== undefined ? (isPublic ? 1 : 0) : 1,
      createdBy || null,
      createdBy || null,
    ]
  );

  return findById(result.insertId);
};

const update = async (id, fields, updatedBy) => {
  const allowed = ['category_id', 'title', 'slug', 'body', 'excerpt', 'is_public',
                   'status', 'reviewed_by', 'reviewed_at', 'published_at', 'version'];
  const setClauses = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push('updated_by = ?');
  params.push(updatedBy || null, id);

  await getPool().execute(
    `UPDATE kb_articles SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
  return findById(id);
};

const softDelete = async (id) => {
  await getPool().execute(
    `UPDATE kb_articles SET deleted_at = NOW() WHERE id = ?`,
    [id]
  );
};

// ─── Version snapshots ─────────────────────────────────────────────────────

/**
 * Insert a version snapshot into kb_article_versions.
 */
const snapshotVersion = async (articleId, versionNumber, title, body, changedBy, changeNote) => {
  await getPool().execute(
    `INSERT INTO kb_article_versions (article_id, version, title, body, changed_by, change_note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [articleId, versionNumber, title, body, changedBy || null, changeNote || null]
  );
};

const getVersions = async (articleId) => {
  const [rows] = await getPool().execute(
    `SELECT v.id, v.version, v.title, v.change_note, v.created_at,
            u.first_name AS changed_by_first, u.last_name AS changed_by_last
     FROM kb_article_versions v
     LEFT JOIN users u ON v.changed_by = u.id
     WHERE v.article_id = ?
     ORDER BY v.version DESC`,
    [articleId]
  );
  return rows;
};

const getVersionById = async (articleId, versionId) => {
  const [rows] = await getPool().execute(
    `SELECT v.*,
            u.first_name AS changed_by_first, u.last_name AS changed_by_last
     FROM kb_article_versions v
     LEFT JOIN users u ON v.changed_by = u.id
     WHERE v.article_id = ? AND v.id = ?`,
    [articleId, versionId]
  );
  return rows[0] || null;
};

// ─── Slug uniqueness ───────────────────────────────────────────────────────

const slugExists = async (slug, excludeId = null) => {
  const params = [slug];
  const excludeClause = excludeId ? ' AND id != ?' : '';
  if (excludeId) params.push(excludeId);

  const [[{ count }]] = await getPool().execute(
    `SELECT COUNT(*) AS count FROM kb_articles WHERE slug = ? AND deleted_at IS NULL${excludeClause}`,
    params
  );
  return count > 0;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  softDelete,
  snapshotVersion,
  getVersions,
  getVersionById,
  slugExists,
};
