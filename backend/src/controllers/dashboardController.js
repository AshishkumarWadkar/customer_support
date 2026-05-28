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

module.exports = { getAdminDashboard };
