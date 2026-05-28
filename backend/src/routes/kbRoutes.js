const express = require('express');
const router = express.Router();
const kbController = require('../controllers/kbController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize, requirePermission } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

const ALL_STAFF    = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT];
const MANAGERS_UP  = [ROLES.SUPER_ADMIN, ROLES.MANAGER];
const ALL          = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT, ROLES.CUSTOMER];

router.use(authenticate);

// ─── Article CRUD ──────────────────────────────────────────────────────────

// List articles — customers see only published/public; staff see all statuses
router.get('/',    authorize(ALL),       kbController.list);

// Create a draft — requires kb.create permission
router.post('/',   requirePermission('kb.create'), kbController.create);

// Get single article — visibility enforced in service
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
