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

/**
 * Aggregate stats for the manager dashboard.
 * Scoped to the manager's own department (via req caller) or all departments if
 * the manager has no department assigned.
 *
 * Returns:
 *   openTickets, resolvedToday, escalatedTickets, avgResolutionHours,
 *   slaBreached, teamWorkload[], agentPerformance[], ticketsByPriority[],
 *   weeklyTrend[], pendingCustomerReply
 *
 * @param {number|null} departmentId  - Filter to a specific department (null = all)
 */
const getManagerStats = async (departmentId = null) => {
  const pool = getPool();

  // Department filter clause — applied to tickets table
  const deptFilter = departmentId
    ? 'AND t.department_id = ?'
    : '';
  const deptParams = departmentId ? [departmentId] : [];

  // 1. Open tickets (not resolved/closed)
  const [[{ openTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS openTickets
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.status NOT IN ('resolved', 'closed')
       ${deptFilter}`,
    deptParams
  );

  // 2. Resolved today
  const [[{ resolvedToday }]] = await pool.execute(
    `SELECT COUNT(*) AS resolvedToday
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.status IN ('resolved', 'closed')
       AND DATE(t.resolved_at) = CURDATE()
       ${deptFilter}`,
    deptParams
  );

  // 3. Currently escalated tickets
  const [[{ escalatedTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS escalatedTickets
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.is_escalated = 1
       AND t.status NOT IN ('resolved', 'closed')
       ${deptFilter}`,
    deptParams
  );

  // 4. Tickets awaiting customer reply
  const [[{ pendingCustomerReply }]] = await pool.execute(
    `SELECT COUNT(*) AS pendingCustomerReply
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.status = 'pending_customer'
       ${deptFilter}`,
    deptParams
  );

  // 5. Average resolution time in hours (this month)
  const [[{ avgResolutionHours }]] = await pool.execute(
    `SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)), 1) AS avgResolutionHours
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.resolved_at IS NOT NULL
       AND t.resolved_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
       ${deptFilter}`,
    deptParams
  );

  // 6. SLA breached tickets (active, not yet resolved)
  const [[{ slaBreached }]] = await pool.execute(
    `SELECT COUNT(*) AS slaBreached
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.sla_status = 'breached'
       AND t.status NOT IN ('resolved', 'closed')
       ${deptFilter}`,
    deptParams
  );

  // 7. Per-team workload — open ticket count per team
  const teamWorkloadParams = departmentId
    ? [departmentId]
    : [];
  const teamWorkloadFilter = departmentId
    ? 'AND tm.department_id = ?'
    : '';
  const [teamWorkload] = await pool.execute(
    `SELECT
       tm.id AS teamId,
       tm.name AS teamName,
       COUNT(t.id) AS openTickets,
       SUM(CASE WHEN t.sla_status = 'breached' THEN 1 ELSE 0 END) AS slaBreached
     FROM teams tm
     LEFT JOIN tickets t
       ON t.team_id = tm.id
       AND t.deleted_at IS NULL
       AND t.status NOT IN ('resolved', 'closed')
     WHERE tm.deleted_at IS NULL
       AND tm.is_active = 1
       ${teamWorkloadFilter}
     GROUP BY tm.id, tm.name
     ORDER BY openTickets DESC`,
    teamWorkloadParams
  );

  // 8. Agent performance this month — resolved count + avg resolution time
  const [agentPerformance] = await pool.execute(
    `SELECT
       u.id,
       CONCAT(u.first_name, ' ', u.last_name) AS name,
       u.avatar_url AS avatarUrl,
       COUNT(t.id) AS resolvedThisMonth,
       ROUND(AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)), 1) AS avgResolutionHours
     FROM tickets t
     JOIN users u ON t.assigned_to = u.id
     WHERE t.deleted_at IS NULL
       AND t.status IN ('resolved', 'closed')
       AND t.resolved_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
       ${deptFilter}
     GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
     ORDER BY resolvedThisMonth DESC
     LIMIT 10`,
    deptParams
  );

  // 9. Tickets by priority (open only)
  const [ticketsByPriority] = await pool.execute(
    `SELECT t.priority, COUNT(*) AS count
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.status NOT IN ('resolved', 'closed')
       ${deptFilter}
     GROUP BY t.priority
     ORDER BY FIELD(t.priority, 'critical', 'high', 'medium', 'low')`,
    deptParams
  );

  // 10. Weekly trend — new tickets per day for the past 7 days
  const [weeklyTrend] = await pool.execute(
    `SELECT
       DATE_FORMAT(t.created_at, '%b %d') AS date,
       COUNT(*) AS count
     FROM tickets t
     WHERE t.deleted_at IS NULL
       AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       ${deptFilter}
     GROUP BY DATE(t.created_at)
     ORDER BY DATE(t.created_at) ASC`,
    deptParams
  );

  return {
    openTickets,
    resolvedToday,
    escalatedTickets,
    pendingCustomerReply,
    avgResolutionHours: avgResolutionHours || 0,
    slaBreached,
    teamWorkload,
    agentPerformance,
    ticketsByPriority,
    weeklyTrend,
  };
};

module.exports = { getAdminStats, getManagerStats };
