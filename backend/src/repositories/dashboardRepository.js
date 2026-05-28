const { getPool } = require('../config/database');

/**
 * Aggregate stats for the admin dashboard.
 * Returns: totalTickets, openTickets, resolvedToday, avgResolutionHours,
 *          slaComplianceRate, byStatus[], trend[], byPriority[], topAgents[]
 */
const getAdminStats = async () => {
  const pool = getPool();

  // 1. Total non-deleted tickets
  const [[{ totalTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS totalTickets FROM tickets WHERE deleted_at IS NULL`
  );

  // 2. Open tickets (not resolved / closed)
  const [[{ openTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS openTickets
     FROM tickets
     WHERE deleted_at IS NULL
       AND status NOT IN ('resolved', 'closed')`
  );

  // 3. Resolved today
  const [[{ resolvedToday }]] = await pool.execute(
    `SELECT COUNT(*) AS resolvedToday
     FROM tickets
     WHERE deleted_at IS NULL
       AND status IN ('resolved', 'closed')
       AND DATE(resolved_at) = CURDATE()`
  );

  // 4. Average resolution time in hours (resolved tickets only)
  const [[{ avgResolutionHours }]] = await pool.execute(
    `SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) AS avgResolutionHours
     FROM tickets
     WHERE deleted_at IS NULL
       AND resolved_at IS NOT NULL`
  );

  // 5. SLA compliance rate (percentage of tickets NOT breached)
  const [[{ totalSla, breached }]] = await pool.execute(
    `SELECT
       COUNT(*) AS totalSla,
       SUM(CASE WHEN sla_status = 'breached' THEN 1 ELSE 0 END) AS breached
     FROM tickets
     WHERE deleted_at IS NULL`
  );
  const slaComplianceRate =
    totalSla > 0
      ? parseFloat(((1 - breached / totalSla) * 100).toFixed(1))
      : 100;

  // 6. Tickets by status
  const [byStatus] = await pool.execute(
    `SELECT status, COUNT(*) AS count
     FROM tickets
     WHERE deleted_at IS NULL
     GROUP BY status
     ORDER BY count DESC`
  );

  // 7. Ticket trend — last 7 days
  const [trend] = await pool.execute(
    `SELECT
       DATE_FORMAT(created_at, '%b %d') AS date,
       COUNT(*) AS count
     FROM tickets
     WHERE deleted_at IS NULL
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) ASC`
  );

  // 8. Tickets by priority
  const [byPriority] = await pool.execute(
    `SELECT priority, COUNT(*) AS count
     FROM tickets
     WHERE deleted_at IS NULL
     GROUP BY priority
     ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low')`
  );

  // 9. Top agents by resolved tickets this month
  const [topAgents] = await pool.execute(
    `SELECT
       u.id,
       CONCAT(u.first_name, ' ', u.last_name) AS name,
       u.avatar_url AS avatarUrl,
       COUNT(t.id) AS resolved
     FROM tickets t
     JOIN users u ON t.assigned_to = u.id
     WHERE t.deleted_at IS NULL
       AND t.status IN ('resolved', 'closed')
       AND t.resolved_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
     GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
     ORDER BY resolved DESC
     LIMIT 5`
  );

  return {
    totalTickets,
    openTickets,
    resolvedToday,
    avgResolutionHours: avgResolutionHours || 0,
    slaComplianceRate,
    byStatus,
    trend,
    byPriority,
    topAgents,
  };
};

module.exports = { getAdminStats };
