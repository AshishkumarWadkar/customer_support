const dashboardRepo = require('../repositories/dashboardRepository');
const { sendSuccess } = require('../utils/responseUtils');

const getAdminDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardRepo.getAdminStats();
    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

const getManagerDashboard = async (req, res, next) => {
  try {
    // Scope metrics to the manager's own department when set; null means all.
    const departmentId = req.user.departmentId || null;
    const stats = await dashboardRepo.getManagerStats(departmentId);
    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard, getManagerDashboard };
