const dashboardRepo = require('../repositories/dashboardRepository');
const { sendSuccess } = require('../utils/responseUtils');

const VALID_RANGES = new Set(['today', '7d', '30d']);

const getAdminDashboard = async (req, res, next) => {
  try {
    const range = VALID_RANGES.has(req.query.range) ? req.query.range : '7d';
    const stats = await dashboardRepo.getAdminStats(range);
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

const getAgentDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardRepo.getAgentStats(req.user.id);
    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard, getManagerDashboard, getAgentDashboard };
