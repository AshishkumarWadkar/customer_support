const ticketService = require('../services/ticketService');
const userRepo = require('../repositories/userRepository');
const { sendSuccess, sendCreated, sendPaginated, sendNoContent } = require('../utils/responseUtils');

const create = async (req, res, next) => {
  try {
    const ticket = await ticketService.createTicket(req.body, req.user);
    return sendCreated(res, ticket, 'Ticket created successfully');
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await ticketService.getTickets(req.query, req.user);
    return sendPaginated(res, rows, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);
    return sendSuccess(res, ticket);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const ticket = await ticketService.updateTicket(req.params.id, req.body, req.user);
    return sendSuccess(res, ticket, 'Ticket updated successfully');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const ticketRepo = require('../repositories/ticketRepository');
    await ticketRepo.softDelete(req.params.id);
    return sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const comment = await ticketService.addComment(req.params.id, req.body, req.user);
    return sendCreated(res, comment, 'Comment added');
  } catch (err) {
    next(err);
  }
};

const assign = async (req, res, next) => {
  try {
    const { assignedTo, teamId } = req.body;

    if (!assignedTo || isNaN(Number(assignedTo))) {
      return res.status(400).json({
        success: false,
        message: 'assignedTo must be a valid agent user ID',
        code: 'VALIDATION_ERROR',
      });
    }

    const ticket = await ticketService.assignTicket(
      req.params.id,
      Number(assignedTo),
      teamId ? Number(teamId) : undefined,
      req.user
    );
    return sendSuccess(res, ticket, 'Ticket assigned successfully');
  } catch (err) {
    next(err);
  }
};

// GET /tickets/search?q=&exclude= — live-search for the link ticket dropdown
const search = async (req, res, next) => {
  try {
    const { q, exclude } = req.query;
    if (!q || String(q).trim().length < 2) {
      return sendSuccess(res, []);
    }
    const results = await ticketService.searchTickets(
      String(q).trim(),
      exclude ? Number(exclude) : 0
    );
    return sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
};

// POST /tickets/:id/links — create a link between two tickets
const createLink = async (req, res, next) => {
  try {
    const { linkedTicketId, linkType } = req.body;

    if (!linkedTicketId || isNaN(Number(linkedTicketId))) {
      return res.status(400).json({
        success: false,
        message: 'linkedTicketId must be a valid ticket ID',
        code: 'VALIDATION_ERROR',
      });
    }
    if (!linkType) {
      return res.status(400).json({
        success: false,
        message: 'linkType is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const links = await ticketService.linkTickets(
      req.params.id,
      Number(linkedTicketId),
      linkType,
      req.user
    );
    return sendCreated(res, links, 'Tickets linked successfully');
  } catch (err) {
    // Duplicate-link error comes back as a plain Error from the repo
    if (err.message === 'These tickets are already linked' ||
        err.message === 'A ticket cannot be linked to itself') {
      return res.status(409).json({ success: false, message: err.message, code: 'CONFLICT' });
    }
    next(err);
  }
};

// DELETE /tickets/:id/links/:linkId — remove a link
const deleteLink = async (req, res, next) => {
  try {
    const links = await ticketService.unlinkTickets(
      req.params.id,
      Number(req.params.linkId),
      req.user
    );
    return sendSuccess(res, links, 'Link removed successfully');
  } catch (err) {
    if (err.message === 'Link not found' || err.message === 'Link does not belong to this ticket') {
      return res.status(404).json({ success: false, message: err.message, code: 'NOT_FOUND' });
    }
    next(err);
  }
};

// GET /tickets/agents — list agents available for assignment dropdown
const listAgents = async (req, res, next) => {
  try {
    const agents = await userRepo.findAgents({
      teamId: req.query.teamId ? Number(req.query.teamId) : undefined,
      search: req.query.search,
    });
    return sendSuccess(res, agents);
  } catch (err) {
    next(err);
  }
};

const escalate = async (req, res, next) => {
  try {
    const { reason, escalateTo } = req.body;
    const ticket = await ticketService.escalateTicket(req.params.id, reason, escalateTo, req.user);
    return sendSuccess(res, ticket, 'Ticket escalated');
  } catch (err) {
    next(err);
  }
};

const addTags = async (req, res, next) => {
  try {
    const tags = await ticketService.addTags(req.params.id, req.body.tagIds, req.user);
    return sendSuccess(res, tags, 'Tags added');
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const ticketRepo = require('../repositories/ticketRepository');
    const history = await ticketRepo.getHistory(req.params.id);
    return sendSuccess(res, history);
  } catch (err) {
    next(err);
  }
};

const submitCSAT = async (req, res, next) => {
  try {
    const { score, comment } = req.body;
    const ticket = await ticketService.submitCSAT(req.params.id, score, comment, req.user);
    return sendSuccess(res, ticket, 'CSAT submitted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create, list, getById, update, remove,
  addComment, assign, listAgents, escalate, addTags, getHistory, submitCSAT,
  search, createLink, deleteLink,
};
