const slaService = require('../services/slaService');
const ticketRepo = require('../repositories/ticketRepository');
const { sendSuccess } = require('../utils/responseUtils');
const { NotFoundError, ValidationError } = require('../middlewares/errorMiddleware');

/**
 * GET /api/v1/tickets/:id/sla
 * Return the SLA timer for a ticket, enriched with the effective sla_status.
 */
const getSlaTimer = async (req, res, next) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id);
    if (!ticket) throw new NotFoundError('Ticket');

    const timer = await slaService.getSlaTimer(req.params.id);
    if (!timer) {
      return sendSuccess(res, null, 'No SLA timer found for this ticket');
    }

    return sendSuccess(res, timer);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tickets/:id/sla/pause
 * Pause the SLA timer (e.g. when awaiting customer response).
 */
const pauseTimer = async (req, res, next) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id);
    if (!ticket) throw new NotFoundError('Ticket');

    const timer = await slaService.getSlaTimer(req.params.id);
    if (!timer) throw new ValidationError('No SLA timer found for this ticket');
    if (timer.is_paused) throw new ValidationError('SLA timer is already paused');

    const updated = await slaService.pauseTimer(req.params.id);
    return sendSuccess(res, updated, 'SLA timer paused');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tickets/:id/sla/resume
 * Resume a paused SLA timer, shifting deadlines forward by elapsed pause time.
 */
const resumeTimer = async (req, res, next) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id);
    if (!ticket) throw new NotFoundError('Ticket');

    const timer = await slaService.getSlaTimer(req.params.id);
    if (!timer) throw new ValidationError('No SLA timer found for this ticket');
    if (!timer.is_paused) throw new ValidationError('SLA timer is not paused');

    const updated = await slaService.resumeTimer(req.params.id);
    return sendSuccess(res, updated, 'SLA timer resumed');
  } catch (err) {
    next(err);
  }
};

module.exports = { getSlaTimer, pauseTimer, resumeTimer };
