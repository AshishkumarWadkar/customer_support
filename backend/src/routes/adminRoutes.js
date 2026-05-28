const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require authentication + SUPER_ADMIN role
router.use(authenticate, authorize(['SUPER_ADMIN']));

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', adminController.listUsers);

// ─── Roles ────────────────────────────────────────────────────────────────────
router.get('/roles', adminController.listRoles);

// ─── Single role operations ───────────────────────────────────────────────────
router.post('/users/:id/roles/assign', adminController.assignRole);
router.post('/users/:id/roles/revoke', adminController.revokeRole);

// ─── Bulk operations ──────────────────────────────────────────────────────────
router.post('/roles/bulk-assign', adminController.bulkAssignRole);
router.post('/roles/bulk-revoke', adminController.bulkRevokeRole);

// ─── Audit logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
