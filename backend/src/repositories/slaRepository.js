const { getPool } = require('../config/database');

/**
 * Fetch the SLA timer row for a given ticket.
 * Returns null if no timer exists yet.
 */
const findByTicketId = async (ticketId) => {
  const [rows] = await getPool().execute(
    `SELECT st.*, sp.frt_hours, sp.rt_hours, sp.name AS policy_name
     FROM sla_timers st
     JOIN sla_policies sp ON sp.id = st.sla_policy_id
     WHERE st.ticket_id = ?`,
    [ticketId]
  );
  return rows[0] || null;
};

/**
 * Create a new SLA timer record for a ticket.
 * @param {object} data
 * @param {number} data.ticketId
 * @param {number} data.slaPolicyId
 * @param {Date}   data.frtDeadline
 * @param {Date}   data.rtDeadline
 */
const create = async (data) => {
  const { ticketId, slaPolicyId, frtDeadline, rtDeadline } = data;
  await getPool().execute(
    `INSERT INTO sla_timers
       (ticket_id, sla_policy_id, frt_deadline, rt_deadline,
        frt_breached, rt_breached, is_paused, paused_duration_secs)
     VALUES (?, ?, ?, ?, 0, 0, 0, 0)`,
    [ticketId, slaPolicyId, frtDeadline, rtDeadline]
  );
  return findByTicketId(ticketId);
};

/**
 * Update specific fields on an existing SLA timer row.
 * Accepts camelCase keys and maps them to DB columns.
 */
const update = async (ticketId, fields) => {
  const colMap = {
    frtDeadline:        'frt_deadline',
    rtDeadline:         'rt_deadline',
    frtBreached:        'frt_breached',
    rtBreached:         'rt_breached',
    frtAchievedAt:      'frt_achieved_at',
    rtAchievedAt:       'rt_achieved_at',
    isPaused:           'is_paused',
    pausedAt:           'paused_at',
    pausedDurationSecs: 'paused_duration_secs',
  };

  const setClauses = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    const col = colMap[key];
    if (col) {
      setClauses.push(`${col} = ?`);
      params.push(val);
    }
  }

  if (setClauses.length === 0) return findByTicketId(ticketId);

  params.push(ticketId);
  await getPool().execute(
    `UPDATE sla_timers SET ${setClauses.join(', ')} WHERE ticket_id = ?`,
    params
  );
  return findByTicketId(ticketId);
};

/**
 * Find all active (non-paused) timers that have breachable deadlines.
 * Used by the poller to detect newly breached SLAs.
 *
 * Returns timers where:
 *  - FRT deadline has passed and FRT not yet achieved OR already marked breached
 *  - RT deadline has passed and RT not yet achieved OR already marked breached
 */
const findBreachCandidates = async () => {
  const [rows] = await getPool().execute(
    `SELECT st.ticket_id,
            st.frt_deadline, st.rt_deadline,
            st.frt_breached, st.rt_breached,
            st.frt_achieved_at, st.rt_achieved_at,
            st.is_paused
     FROM sla_timers st
     WHERE st.is_paused = 0
       AND (
         (st.frt_breached = 0 AND st.frt_achieved_at IS NULL AND st.frt_deadline IS NOT NULL AND st.frt_deadline <= NOW())
         OR
         (st.rt_breached  = 0 AND st.rt_achieved_at  IS NULL AND st.rt_deadline  IS NOT NULL AND st.rt_deadline  <= NOW())
       )`
  );
  return rows;
};

module.exports = { findByTicketId, create, update, findBreachCandidates };
