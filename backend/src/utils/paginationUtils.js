/**
 * Parse pagination params from query string
 */
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build ORDER BY clause safely
 */
const getOrderBy = (query, allowedColumns, defaultColumn = 'created_at', defaultDir = 'DESC') => {
  const col = allowedColumns.includes(query.sortBy) ? query.sortBy : defaultColumn;
  const dir = ['ASC', 'DESC'].includes((query.sortDir || '').toUpperCase())
    ? query.sortDir.toUpperCase()
    : defaultDir;
  return `${col} ${dir}`;
};

module.exports = { getPagination, getOrderBy };
