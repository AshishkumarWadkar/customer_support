const { getPool } = require('../config/database');

/**
 * Resolve a time-range label into a MySQL INTERVAL expression and a
 * human-readable trend date format.
 *
 * Supported values: 'today' | '7d' (default) | '30d'
 *
 * Returns { intervalExpr, trendDays, trendFormat }
 *   intervalExpr — used in WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ...)
 *   trendDays    — number of days of trend data to return
 *   trendFormat  — DATE_FORMAT pattern for trend X-axis labels
 */
const resolveRange = (range) => {
  switch (range) {
    case 'today':
      return { intervalExpr: '0 DAY', trendDays: 0, trendFormat: '%H:00' };
    case '30d':
      return { intervalExpr: '29 DAY', trendDays: 29, trendFormat: '%b %d' };
    case '7d':
    default:
      return { intervalExpr: '6 DAY', trendDays: 6, trendFormat: '%b %d' };
  }
};

/**
 * Aggregate stats for the admin dashboard.
 *
 * @param {string} range  'today' | '7d' | '30d'  (default: '7d')
 *
 * Returns:
 *   totalTickets        — tickets created within the selected range
 *   openTickets         — active tickets (not resolved/closed), all time
 *   resolvedToday       — tickets resolved today
 *   avgResolutionHours  — avg resolution time in hours (resolved, all time)
 *   slaComplianceRate   — % of tickets NOT breached (all time)
 *   slaBreakdown        — { onTrack, atRisk, breached, paused, none } counts (all time, open only)
 *   byStatus[]          — { status, count } (all time)
 *   trend[]             — { date, count } within selected range
 *   byPriority[]        — { priority, count } (all time)
 *   topAgents[]         — top 5 by resolved this month
 *   range               — echoed back so the client knows which window was used
 */
const getAdminStats = async (range = '7d') => {
  const pool = getPool();
  const { intervalExpr, trendDays, trendFormat } = resolveRange(range);

  // Build the range filter used for totalTickets and trend
  // 'today' uses DATE(created_at) = CURDATE(); others use an INTERVAL subtraction
  const rangeFilter =
    range === 'today'
      ? 'AND DATE(created_at) = CURDATE()'
      : `AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${intervalExpr})`;

  // 1. Total tickets created within the selected range
  const [[{ totalTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS totalTickets
     FROM tickets
     WHERE deleted_at IS NULL
       ${rangeFilter}`
  );

  // 2. Open tickets (not resolved / closed) — always all-time
  const [[{ openTickets }]] = await pool.execute(
    `SELECT COUNT(*) AS openTickets
     FROM tickets
     WHERE deleted_at IS NULL
       AND status NOT IN ('resolved', 'closed')`
  );

  // 3. Resolved today — always CURDATE()
  const [[{ resolvedToday }]] = await pool.execute(
    `SELECT COUNT(*) AS resolvedToday
     FROM tickets
     WHERE deleted_at IS NULL
       AND status IN ('resolved', 'closed')
       AND DATE(resolved_at) = CURDATE()`
  );

  // 4. Average resolution time in hours (resolved tickets, all time)
  const [[{ avgResolutionHours }]] = await pool.execute(
    `SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) AS avgResolutionHours
     FROM tickets
     WHERE deleted_at IS NULL
       AND resolved_at IS NOT NULL`
  );

  // 5. SLA compliance rate — % of all non-deleted tickets NOT breached
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

  // 6. SLA breakdown by status (open tickets only — gives actionable picture)
  const [[slaBreakdownRow]] = await pool.execute(
    `SELECT
       SUM(CASE WHEN sla_status = 'on_track'  THEN 1 ELSE 0 END) AS onTrack,
       SUM(CASE WHEN sla_status = 'at_risk'   THEN 1 ELSE 0 END) AS atRisk,
       SUM(CASE WHEN sla_status = 'breached'  THEN 1 ELSE 0 END) AS breached,
       SUM(CASE WHEN sla_status = 'paused'    THEN 1 ELSE 0 END) AS paused,
       SUM(CASE WHEN sla_status = 'none'      THEN 1 ELSE 0 END) AS none
     FROM tickets
     WHERE deleted_at IS NULL
       AND status NOT IN ('resolved', 'closed')`
  );
  const slaBreakdown = {
    onTrack:  Number(slaBreakdownRow.onTrack  || 0),
    atRisk:   Number(slaBreakdownRow.atRisk   || 0),
    breached: Number(slaBreakdownRow.breached || 0),
    paused:   Number(slaBreakdownRow.paused   || 0),
    none:     Number(slaBreakdownRow.none     || 0),
  };

  // 7. Tickets by status (all time)
  const [byStatus] = await pool.execute(
    `SELECT status, COUNT(*) AS count
     FROM tickets
     WHERE deleted_at IS NULL
     GROUP BY status
     ORDER BY count DESC`
  );

  // 8. Ticket trend — within selected range
  //    'today' groups by hour; 7d/30d group by calendar day
  let trend;
  if (range === 'today') {
    [trend] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '${trendFormat}') AS date,
         COUNT(*) AS count
       FROM tickets
       WHERE deleted_at IS NULL
         AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY HOUR(created_at) ASC`
    );
  } else {
    [trend] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '${trendFormat}') AS date,
         COUNT(*) AS count
       FROM tickets
       WHERE deleted_at IS NULL
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${trendDays} DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`
    );
  }

  // 9. Tickets by priority (all time)
  const [byPriority] = await pool.execute(
    `SELECT priority, COUNT(*) AS count
     FROM tickets
     WHERE deleted_at IS NULL
     GROUP BY priority
     ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low')`
  );

  // 10. Top agents by resolved tickets this month
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
    slaBreakdown,
    byStatus,
    trend,
    byPriority,
    topAgents,
    range,
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
