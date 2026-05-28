const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

const MANAGERS_UP = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.use(authenticate);

router.get('/admin',   authorize(MANAGERS_UP),         dashboardController.getAdminDashboard);
router.get('/manager', authorize([ROLES.MANAGER]),      dashboardController.getManagerDashboard);

module.exports = router;
