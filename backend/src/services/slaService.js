const slaRepo = require('../repositories/slaRepository');
const ticketRepo = require('../repositories/ticketRepository');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Add `hours` (may be fractional) to a Date and return a new Date.
 */
const addHours = (date, hours) => new Date(date.getTime() + hours * 3600 * 1000);

/**
 * Compute the current SLA status string from a timer row.
 * Called after any mutation to keep tickets.sla_status in sync.
 *
 * Logic:
 *  paused       → is_paused = 1
 *  breached     → rt_breached = 1
 *  at_risk      → less than 20 % of RT window remaining
 *  on_track     → everything else
 *  none         → no timer / no policy
 */
const deriveSlaStatus = (timer) => {
  if (!timer) return 'none';
  if (timer.is_paused) return 'paused';
  if (timer.rt_breached) return 'breached';

  const now = Date.now();
  const rtDeadline = timer.rt_deadline ? new Date(timer.rt_deadline).getTime() : null;

  if (rtDeadline) {
    const msRemaining = rtDeadline - now;
    if (msRemaining < 0) return 'breached';

    // Reconstruct the total RT window using the policy hours stored on the row
    const rtHours = parseFloat(timer.rt_hours || 0);
    const totalWindowMs = rtHours * 3600 * 1000;
    const pctRemaining = totalWindowMs > 0 ? msRemaining / totalWindowMs : 1;
    if (pctRemaining < 0.2) return 'at_risk';
  }

  return 'on_track';
};

/**
 * Push the tickets.sla_status, frt_due_at, and due_at columns
 * to match the current timer state.
 */
const syncTicketSlaFields = async (ticketId, timer) => {
  const slaStatus = deriveSlaStatus(timer);
  const fields = { sla_status: slaStatus };
  if (timer) {
    if (timer.frt_deadline) fields.frt_due_at = new Date(timer.frt_deadline);
    if (timer.rt_deadline)  fields.due_at     = new Date(timer.rt_deadline);
  }
  await ticketRepo.update(ticketId, fields, null);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise an SLA timer for a newly created ticket.
 * Should be called immediately after the ticket row is inserted.
 *
 * @param {number} ticketId
 * @param {number} slaPolicyId
 * @param {Date}   createdAt   — ticket creation timestamp
 */
const initSlaTimer = async (ticketId, slaPolicyId, createdAt) => {
  // Fetch the policy to get frt_hours / rt_hours
  const [[policy]] = await getPool().execute(
    `SELECT id, frt_hours, rt_hours FROM sla_policies WHERE id = ? AND is_active = 1`,
    [slaPolicyId]
  );

  if (!policy) {
    logger.warn(`initSlaTimer: SLA policy ${slaPolicyId} not found or inactive — skipping`);
    return null;
  }

  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const frtDeadline = addHours(base, parseFloat(policy.frt_hours));
  const rtDeadline  = addHours(base, parseFloat(policy.rt_hours));

  const timer = await slaRepo.create({ ticketId, slaPolicyId, frtDeadline, rtDeadline });

  await syncTicketSlaFields(ticketId, timer);

  logger.info(`SLA timer initialised for ticket ${ticketId} — FRT: ${frtDeadline.toISOString()}, RT: ${rtDeadline.toISOString()}`);
  return timer;
};

/**
 * Record that an agent has made the first public response.
 * Clears the FRT breach risk and records the achievement timestamp.
 *
 * @param {number} ticketId
 * @param {Date}   achievedAt
 */
const recordFrtAchieved = async (ticketId, achievedAt) => {
  const timer = await slaRepo.findByTicketId(ticketId);
  if (!timer || timer.frt_achieved_at) return; // already recorded

  const now = achievedAt instanceof Date ? achievedAt : new Date(achievedAt);
  const frtBreached = timer.frt_deadline && now > new Date(timer.frt_deadline) ? 1 : 0;

  const updated = await slaRepo.update(ticketId, {
    frtAchievedAt: now,
    frtBreached,
  });

  await syncTicketSlaFields(ticketId, updated);

  logger.info(`SLA FRT ${frtBreached ? 'BREACHED' : 'achieved'} for ticket ${ticketId} at ${now.toISOString()}`);
  return updated;
};

/**
 * Record that the ticket has been fully resolved.
 * Marks rt_achieved_at and calculates whether the RT was breached.
 *
 * @param {number} ticketId
 * @param {Date}   resolvedAt
 */
const recordRtAchieved = async (ticketId, resolvedAt) => {
  const timer = await slaRepo.findByTicketId(ticketId);
  if (!timer || timer.rt_achieved_at) return; // already recorded

  const now = resolvedAt instanceof Date ? resolvedAt : new Date(resolvedAt);
  const rtBreached = timer.rt_deadline && now > new Date(timer.rt_deadline) ? 1 : 0;

  const updated = await slaRepo.update(ticketId, {
    rtAchievedAt: now,
    rtBreached,
    // Once resolved, stop the countdown — pausing is implicit
    isPaused: 1,
    pausedAt: timer.paused_at || now,
  });

  await syncTicketSlaFields(ticketId, updated);

  logger.info(`SLA RT ${rtBreached ? 'BREACHED' : 'achieved'} for ticket ${ticketId} at ${now.toISOString()}`);
  return updated;
};

/**
 * Pause the SLA timer (e.g. ticket moves to pending_customer).
 * No-op if already paused or if no timer exists.
 *
 * @param {number} ticketId
 */
const pauseTimer = async (ticketId) => {
  const timer = await slaRepo.findByTicketId(ticketId);
  if (!timer || timer.is_paused) return timer; // nothing to do

  const now = new Date();
  const updated = await slaRepo.update(ticketId, {
    isPaused: 1,
    pausedAt: now,
  });

  await ticketRepo.update(ticketId, { sla_status: 'paused' }, null);

  logger.info(`SLA timer paused for ticket ${ticketId} at ${now.toISOString()}`);
  return updated;
};

/**
 * Resume the SLA timer after a pause.
 * Accumulates elapsed pause seconds, shifts both deadlines forward,
 * and recomputes sla_status.
 *
 * @param {number} ticketId
 */
const resumeTimer = async (ticketId) => {
  const timer = await slaRepo.findByTicketId(ticketId);
  if (!timer || !timer.is_paused || !timer.paused_at) return timer; // not paused

  const now = new Date();
  const pausedAt = new Date(timer.paused_at);
  const elapsedSecs = Math.max(0, Math.round((now - pausedAt) / 1000));
  const newPausedDuration = (timer.paused_duration_secs || 0) + elapsedSecs;

  // Shift deadlines forward by the elapsed pause duration
  const shiftMs = elapsedSecs * 1000;
  const newFrtDeadline = timer.frt_deadline ? new Date(new Date(timer.frt_deadline).getTime() + shiftMs) : null;
  const newRtDeadline  = timer.rt_deadline  ? new Date(new Date(timer.rt_deadline).getTime()  + shiftMs) : null;

  const updated = await slaRepo.update(ticketId, {
    isPaused:           0,
    pausedAt:           null,
    pausedDurationSecs: newPausedDuration,
    frtDeadline:        newFrtDeadline,
    rtDeadline:         newRtDeadline,
  });

  await syncTicketSlaFields(ticketId, updated);

  logger.info(
    `SLA timer resumed for ticket ${ticketId} — pause was ${elapsedSecs}s, ` +
    `total paused: ${newPausedDuration}s, new RT deadline: ${newRtDeadline?.toISOString()}`
  );
  return updated;
};

/**
 * Return the current SLA timer for a ticket (enriched with effective status).
 *
 * @param {number} ticketId
 */
const getSlaTimer = async (ticketId) => {
  const timer = await slaRepo.findByTicketId(ticketId);
  if (!timer) return null;
  return {
    ...timer,
    effective_sla_status: deriveSlaStatus(timer),
  };
};

/**
 * Poller function: scan for newly breached SLA timers, mark them, and return
 * the list of newly breached ticket IDs so the caller can emit events.
 *
 * @returns {Array<{ ticketId, frtNewlyBreached, rtNewlyBreached }>}
 */
const checkAndMarkBreaches = async () => {
  const candidates = await slaRepo.findBreachCandidates();
  if (candidates.length === 0) return [];

  const breached = [];

  for (const row of candidates) {
    const now = Date.now();
    const frtNewly = !row.frt_breached && !row.frt_achieved_at &&
                     row.frt_deadline && new Date(row.frt_deadline).getTime() <= now;
    const rtNewly  = !row.rt_breached  && !row.rt_achieved_at  &&
                     row.rt_deadline  && new Date(row.rt_deadline).getTime()  <= now;

    if (!frtNewly && !rtNewly) continue;

    const updates = {};
    if (frtNewly) updates.frtBreached = 1;
    if (rtNewly)  updates.rtBreached  = 1;

    await slaRepo.update(row.ticket_id, updates);
    await ticketRepo.update(row.ticket_id, { sla_status: 'breached' }, null);

    breached.push({
      ticketId:        row.ticket_id,
      frtNewlyBreached: frtNewly,
      rtNewlyBreached:  rtNewly,
    });

    logger.warn(
      `SLA BREACH — ticket ${row.ticket_id}` +
      (frtNewly ? ' [FRT]' : '') +
      (rtNewly  ? ' [RT]'  : '')
    );
  }

  return breached;
};

module.exports = {
  initSlaTimer,
  recordFrtAchieved,
  recordRtAchieved,
  pauseTimer,
  resumeTimer,
  getSlaTimer,
  checkAndMarkBreaches,
};
