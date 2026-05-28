const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent router
const slaController = require('../controllers/slaController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

const ALL_STAFF   = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT];
const MANAGERS_UP = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.use(authenticate);

// GET  /api/v1/tickets/:id/sla        — read the SLA timer (all staff)
router.get('/',       authorize(ALL_STAFF),   slaController.getSlaTimer);

// POST /api/v1/tickets/:id/sla/pause  — pause the timer (managers only)
router.post('/pause', authorize(MANAGERS_UP), slaController.pauseTimer);

// POST /api/v1/tickets/:id/sla/resume — resume the timer (managers only)
router.post('/resume', authorize(MANAGERS_UP), slaController.resumeTimer);

module.exports = router;
