const adminService = require('../services/adminService');
const adminRepo    = require('../repositories/adminRepository');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/responseUtils');
const { ValidationError, NotFoundError } = require('../middlewares/errorMiddleware');

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

// ─── Ticket Categories ────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/ticket-categories
 * List all ticket categories (hierarchical, with parent name).
 * Query: activeOnly=true to filter to active categories only.
 */
const listTicketCategories = async (req, res, next) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const categories = await adminRepo.findAllTicketCategories({ activeOnly });
    return sendSuccess(res, categories, 'Ticket categories retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/ticket-categories
 * Create a new ticket category.
 * Body: { name, description?, parentId?, sortOrder? }
 */
const createTicketCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;

    if (!name || !name.trim()) throw new ValidationError('name is required');

    // Validate parent exists when provided
    if (parentId) {
      const parent = await adminRepo.findTicketCategoryById(parentId);
      if (!parent) throw new NotFoundError('Parent category');
      // Only allow one level of nesting (parent must be a root category)
      if (parent.parent_id !== null) {
        throw new ValidationError('Sub-categories cannot be nested more than one level deep');
      }
    }

    // Check for duplicate name at the same level
    const nameTaken = await adminRepo.ticketCategoryNameExists(name.trim(), parentId || null);
    if (nameTaken) {
      throw new ValidationError(`A category named '${name.trim()}' already exists at this level`);
    }

    const category = await adminRepo.createTicketCategory({
      name: name.trim(),
      description: description || null,
      parentId: parentId || null,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    });

    return sendCreated(res, category, 'Ticket category created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/admin/ticket-categories/:id
 * Update an existing ticket category.
 * Body: { name?, description?, parentId?, sortOrder?, isActive? }
 */
const updateTicketCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await adminRepo.findTicketCategoryById(id);
    if (!existing) throw new NotFoundError('Ticket category');

    const { name, description, parentId, sortOrder, isActive } = req.body;
    const fields = {};

    if (name !== undefined) {
      if (!name.trim()) throw new ValidationError('name cannot be empty');
      const resolvedParent = parentId !== undefined ? (parentId || null) : existing.parent_id;
      const nameTaken = await adminRepo.ticketCategoryNameExists(name.trim(), resolvedParent, id);
      if (nameTaken) {
        throw new ValidationError(`A category named '${name.trim()}' already exists at this level`);
      }
      fields.name = name.trim();
    }

    if (description !== undefined) fields.description = description;

    if (parentId !== undefined) {
      const resolvedParentId = parentId || null;
      if (resolvedParentId) {
        const parent = await adminRepo.findTicketCategoryById(resolvedParentId);
        if (!parent) throw new NotFoundError('Parent category');
        if (parent.parent_id !== null) {
          throw new ValidationError('Sub-categories cannot be nested more than one level deep');
        }
        if (resolvedParentId === id) {
          throw new ValidationError('A category cannot be its own parent');
        }
      }
      fields.parent_id = resolvedParentId;
    }

    if (sortOrder !== undefined) fields.sort_order = Number(sortOrder);
    if (isActive  !== undefined) fields.is_active  = isActive ? 1 : 0;

    const updated = await adminRepo.updateTicketCategory(id, fields);
    return sendSuccess(res, updated, 'Ticket category updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/ticket-categories/:id/toggle
 * Toggle the is_active flag of a ticket category.
 */
const toggleTicketCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await adminRepo.findTicketCategoryById(id);
    if (!existing) throw new NotFoundError('Ticket category');

    const updated = await adminRepo.updateTicketCategory(id, { is_active: existing.is_active ? 0 : 1 });
    const state = updated.is_active ? 'activated' : 'deactivated';
    return sendSuccess(res, updated, `Ticket category ${state} successfully`);
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
  listTicketCategories,
  createTicketCategory,
  updateTicketCategory,
  toggleTicketCategory,
};
