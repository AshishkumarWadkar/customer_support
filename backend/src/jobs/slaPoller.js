const slaService = require('../services/slaService');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

let pollerTimer = null;

/**
 * Run one breach-check cycle:
 *  1. Ask slaService to detect and mark any newly breached timers.
 *  2. For each newly breached ticket, emit a `sla:breach` Socket.IO event
 *     to the `staff` room so the frontend can alert agents in real time.
 */
const runCycle = async () => {
  try {
    const breached = await slaService.checkAndMarkBreaches();

    if (breached.length === 0) return;

    let io;
    try {
      io = getIO();
    } catch {
      // Socket.IO may not be ready during unit tests — skip emit silently
      io = null;
    }

    for (const { ticketId, frtNewlyBreached, rtNewlyBreached } of breached) {
      if (io) {
        io.to('staff').emit('sla:breach', {
          ticketId,
          frtBreached: frtNewlyBreached,
          rtBreached:  rtNewlyBreached,
          breachedAt:  new Date().toISOString(),
        });
      }
      logger.warn(
        `[SLA Poller] sla:breach emitted for ticket ${ticketId}` +
        (frtNewlyBreached ? ' [FRT]' : '') +
        (rtNewlyBreached  ? ' [RT]'  : '')
      );
    }
  } catch (err) {
    // Never let a single cycle failure crash the poller
    logger.error(`[SLA Poller] cycle error: ${err.message}`, { stack: err.stack });
  }
};

/**
 * Start the SLA breach-polling job.
 * Safe to call multiple times — will not start a second timer.
 */
const startSlaPoller = () => {
  if (pollerTimer) return; // already running

  // Run once immediately on startup, then on the fixed interval
  runCycle();
  pollerTimer = setInterval(runCycle, POLL_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is active
  if (pollerTimer.unref) pollerTimer.unref();

  logger.info(`[SLA Poller] started — polling every ${POLL_INTERVAL_MS / 1000}s`);
};

/**
 * Stop the poller (useful for clean shutdown and tests).
 */
const stopSlaPoller = () => {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info('[SLA Poller] stopped');
  }
};

module.exports = { startSlaPoller, stopSlaPoller };
