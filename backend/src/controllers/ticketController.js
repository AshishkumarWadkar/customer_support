const ticketService = require('../services/ticketService');
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
    const ticket = await ticketService.assignTicket(req.params.id, assignedTo, teamId, req.user);
    return sendSuccess(res, ticket, 'Ticket assigned successfully');
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

module.exports = { create, list, getById, update, remove, addComment, assign, escalate, addTags, getHistory, submitCSAT };
