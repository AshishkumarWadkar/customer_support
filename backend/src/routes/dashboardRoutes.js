const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { mustChangePassword } = require('../middlewares/mustChangePasswordMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

const MANAGERS_UP = [ROLES.SUPER_ADMIN, ROLES.MANAGER];
const AGENTS_UP   = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT];

router.use(authenticate);
router.use(mustChangePassword);

router.get('/admin',   authorize(MANAGERS_UP),  dashboardController.getAdminDashboard);
router.get('/manager', authorize([ROLES.MANAGER]), dashboardController.getManagerDashboard);
router.get('/agent',   authorize(AGENTS_UP),    dashboardController.getAgentDashboard);

module.exports = router;
