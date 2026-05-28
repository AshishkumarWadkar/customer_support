const slaRepo = require('../repositories/slaRepository');
const ticketRepo = require('../repositories/ticketRepository');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Add `hours` (may be fractional) to a Date and return a new Date.
 * Used only for policies where use_business_hours = 0 (24x7).
 */
const addHours = (date, hours) => new Date(date.getTime() + hours * 3600 * 1000);

/**
 * Fetch business-hours schedule and holidays for a policy from the DB.
 * Returns:
 *   schedule  — Map<dayOfWeek (0–6), { startMins, endMins }>
 *               Only active days are included.
 *   holidays  — Set<'YYYY-MM-DD'>
 *
 * @param {number} slaPolicyId
 */
const fetchBusinessCalendar = async (slaPolicyId) => {
  const pool = getPool();

  const [bhRows] = await pool.execute(
    `SELECT day_of_week, start_time, end_time
     FROM sla_business_hours
     WHERE sla_id = ? AND is_active = 1`,
    [slaPolicyId]
  );

  const schedule = new Map();
  for (const row of bhRows) {
    // Convert HH:MM:SS to minutes-since-midnight for easy arithmetic
    const toMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    schedule.set(row.day_of_week, {
      startMins: toMins(row.start_time),
      endMins:   toMins(row.end_time),
    });
  }

  const [holRows] = await pool.execute(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS d
     FROM sla_holidays
     WHERE sla_id = ?`,
    [slaPolicyId]
  );

  const holidays = new Set(holRows.map((r) => r.d));

  return { schedule, holidays };
};

/**
 * Given a start datetime and a number of business hours to consume,
 * walk forward through the business calendar and return the deadline Date.
 *
 * Rules:
 *  1. Holidays are skipped entirely (no business time on those dates).
 *  2. Only time within the [startMins, endMins) window on active weekdays counts.
 *  3. If `start` falls outside of business hours, the clock begins at the
 *     next opening of a business day.
 *  4. Fractional hours are supported (sub-minute precision is truncated).
 *
 * @param {Date}   start         — when the ticket was created (or timer started)
 * @param {number} totalHours    — SLA hours to burn (may be fractional)
 * @param {Map}    schedule      — from fetchBusinessCalendar()
 * @param {Set}    holidays      — from fetchBusinessCalendar()
 * @returns {Date}
 */
const computeBusinessHoursDeadline = (start, totalHours, schedule, holidays) => {
  // Work in whole seconds to avoid floating-point drift
  let remainingSecs = Math.round(totalHours * 3600);

  // Clone so we don't mutate the caller's Date
  const cur = new Date(start.getTime());

  // Helper: 'YYYY-MM-DD' string from a Date (in LOCAL time — SLA schedules are
  // stored in the server's local timezone, consistent with how tickets are created)
  const dateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const minuteOfDay = (d) => d.getHours() * 60 + d.getMinutes();

  // Safety cap: never loop more than 730 calendar days (2 years) forward.
  // This guards against a misconfigured policy with no active business days.
  const absoluteCap = new Date(start.getTime() + 730 * 24 * 3600 * 1000);

  while (remainingSecs > 0 && cur < absoluteCap) {
    const dow     = cur.getDay(); // 0 Sun – 6 Sat
    const dayStr  = dateKey(cur);
    const window  = schedule.get(dow);

    // Skip: holiday or no business hours defined for this day
    if (holidays.has(dayStr) || !window) {
      // Jump to midnight of the next calendar day
      cur.setHours(24, 0, 0, 0);
      continue;
    }

    const { startMins, endMins } = window;
    const nowMins = minuteOfDay(cur);

    // Before business hours today — jump to opening time
    if (nowMins < startMins) {
      cur.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
      continue;
    }

    // After business hours today — jump to next calendar day
    if (nowMins >= endMins) {
      cur.setHours(24, 0, 0, 0);
      continue;
    }

    // We are inside business hours.
    // Seconds available until close of business today:
    const secsUntilClose = (endMins - nowMins) * 60 - cur.getSeconds();

    if (remainingSecs <= secsUntilClose) {
      // Deadline falls within today's business window
      cur.setTime(cur.getTime() + remainingSecs * 1000);
      remainingSecs = 0;
    } else {
      // Burn today's remaining business seconds and continue tomorrow
      remainingSecs -= secsUntilClose;
      cur.setHours(24, 0, 0, 0); // midnight = start of next day
    }
  }

  return cur;
};

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
  // Fetch the policy — include use_business_hours flag
  const [[policy]] = await getPool().execute(
    `SELECT id, frt_hours, rt_hours, use_business_hours
     FROM sla_policies
     WHERE id = ? AND is_active = 1`,
    [slaPolicyId]
  );

  if (!policy) {
    logger.warn(`initSlaTimer: SLA policy ${slaPolicyId} not found or inactive — skipping`);
    return null;
  }

  const base       = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const frtHours   = parseFloat(policy.frt_hours);
  const rtHours    = parseFloat(policy.rt_hours);

  let frtDeadline, rtDeadline;

  if (!policy.use_business_hours) {
    // 24x7 policy (e.g. Critical, Enterprise) — plain wall-clock arithmetic
    frtDeadline = addHours(base, frtHours);
    rtDeadline  = addHours(base, rtHours);
  } else {
    // Business-hour-aware policy — walk forward through the calendar
    const { schedule, holidays } = await fetchBusinessCalendar(slaPolicyId);

    if (schedule.size === 0) {
      // Policy says use_business_hours but no days are configured.
      // Fall back to wall-clock so the ticket isn't stuck with a null deadline.
      logger.warn(
        `initSlaTimer: policy ${slaPolicyId} has use_business_hours=1 but no active ` +
        `business-hours rows — falling back to 24x7 calculation`
      );
      frtDeadline = addHours(base, frtHours);
      rtDeadline  = addHours(base, rtHours);
    } else {
      frtDeadline = computeBusinessHoursDeadline(base, frtHours, schedule, holidays);
      rtDeadline  = computeBusinessHoursDeadline(base, rtHours,  schedule, holidays);
    }
  }

  const timer = await slaRepo.create({ ticketId, slaPolicyId, frtDeadline, rtDeadline });

  await syncTicketSlaFields(ticketId, timer);

  logger.info(
    `SLA timer initialised for ticket ${ticketId} ` +
    `[policy=${slaPolicyId}, bh=${policy.use_business_hours}] ` +
    `FRT: ${frtDeadline.toISOString()}, RT: ${rtDeadline.toISOString()}`
  );
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
