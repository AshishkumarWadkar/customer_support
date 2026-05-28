const express = require('express');
const router = express.Router();
const kbController = require('../controllers/kbController');
const { authenticate } = require('../middlewares/authMiddleware');
const { mustChangePassword } = require('../middlewares/mustChangePasswordMiddleware');
const { authorize, requirePermission } = require('../middlewares/rbacMiddleware');
const { getPool } = require('../config/database');
const { ROLES } = require('../constants/roles');

const ALL_STAFF    = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT];
const MANAGERS_UP  = [ROLES.SUPER_ADMIN, ROLES.MANAGER];
const ALL          = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT, ROLES.CUSTOMER];

router.use(authenticate);
router.use(mustChangePassword);

/**
 * Middleware: load the authenticated user's permissions into req.userPermissions
 * (a Set of permission name strings). Results are cached for the request lifetime,
 * so routes that use requirePermission downstream will reuse the same Set.
 */
const loadPermissions = async (req, _res, next) => {
  try {
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
    next();
  } catch (err) {
    next(err);
  }
};

// Apply permission loading to every KB route so that service-level
// canViewArticle() and list filtering always have req.userPermissions available.
router.use(loadPermissions);

// ─── Article CRUD ──────────────────────────────────────────────────────────

// List articles — customers see only published/public; staff filtered by kb.view_internal
router.get('/',    authorize(ALL),       kbController.list);

// Create a draft — requires kb.create permission
router.post('/',   requirePermission('kb.create'), kbController.create);

// Get single article — visibility enforced in service (uses req.userPermissions)
router.get('/:id', authorize(ALL),       kbController.getById);

// Update draft/pending_review — requires kb.create permission
router.put('/:id', requirePermission('kb.create'), kbController.update);

// Soft delete — managers and above only
router.delete('/:id', authorize(MANAGERS_UP), kbController.remove);

// ─── Workflow transitions ──────────────────────────────────────────────────

// Submit draft for review — requires kb.create permission (author submits own draft)
router.post('/:id/submit',  requirePermission('kb.create'),  kbController.submit);

// Publish pending_review → published — requires kb.publish permission
router.post('/:id/publish', requirePermission('kb.publish'), kbController.publish);

// Reject pending_review → draft — requires kb.publish permission
router.post('/:id/reject',  requirePermission('kb.publish'), kbController.reject);

// Archive published → archived — requires kb.publish permission
router.post('/:id/archive', requirePermission('kb.publish'), kbController.archive);

// ─── Version history ───────────────────────────────────────────────────────

// List all version snapshots for an article
router.get('/:id/versions',             authorize(ALL_STAFF), kbController.getVersions);

// Get a specific version snapshot by its ID
router.get('/:id/versions/:versionId',  authorize(ALL_STAFF), kbController.getVersion);

module.exports = router;
