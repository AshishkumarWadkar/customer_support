const ticketRepo = require('../repositories/ticketRepository');
const { NotFoundError, ForbiddenError, ValidationError } = require('../middlewares/errorMiddleware');
const { TICKET_STATUS_TRANSITIONS } = require('../constants/ticketStatus');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');

/**
 * Generate ticket number: TKT-YYYYMMDD-XXXXX
 */
const generateTicketNumber = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await ticketRepo.getTicketCountForToday();
  const seq = String(count + 1).padStart(5, '0');
  return `TKT-${today}-${seq}`;
};

const createTicket = async (data, user) => {
  const ticketNumber = await generateTicketNumber();

  let customerEmail = data.customerEmail;
  let customerName = data.customerName;

  // If customer is creating via portal, use their info
  if (user.role === ROLES.CUSTOMER) {
    customerEmail = user.email;
    customerName = `${user.firstName} ${user.lastName}`;
  }

  const ticket = await ticketRepo.create({
    ...data,
    ticketNumber,
    customerEmail,
    customerName,
    createdBy: user.id,
    source: data.source || (user.role === ROLES.CUSTOMER ? 'portal' : 'agent'),
  });

  await ticketRepo.addHistory({
    ticketId: ticket.id,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName: 'status',
    oldValue: null,
    newValue: 'new',
    changeType: 'create',
  });

  logger.info(`Ticket ${ticket.ticket_number} created by user ${user.id}`);
  return ticket;
};

const getTickets = async (query, user) => {
  return ticketRepo.findAll(query, user.role, user.id);
};

const getTicketById = async (id, user) => {
  const ticket = await ticketRepo.findById(id);
  if (!ticket) throw new NotFoundError('Ticket');

  // Agents can only see tickets assigned to them (unless manager+)
  if (user.role === ROLES.AGENT && ticket.assigned_to !== user.id) {
    throw new ForbiddenError('Access denied to this ticket');
  }

  const [comments, history, tags, attachments] = await Promise.all([
    ticketRepo.getComments(ticket.id, user.role !== ROLES.CUSTOMER),
    ticketRepo.getHistory(ticket.id),
    ticketRepo.getTags(ticket.id),
    ticketRepo.getAttachments(ticket.id),
  ]);

  return { ...ticket, comments, history, tags, attachments };
};

const updateTicket = async (id, fields, user) => {
  const ticket = await ticketRepo.findById(id);
  if (!ticket) throw new NotFoundError('Ticket');

  // Validate status transition
  if (fields.status && fields.status !== ticket.status) {
    const allowed = TICKET_STATUS_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(fields.status)) {
      throw new ValidationError(`Cannot transition from '${ticket.status}' to '${fields.status}'`);
    }
  }

  // Track changes in history
  const historyPromises = [];
  const trackableFields = ['status', 'priority', 'assigned_to', 'team_id', 'department_id'];

  for (const field of trackableFields) {
    const dbField = field;
    const newVal = fields[field];
    if (newVal !== undefined && String(newVal) !== String(ticket[dbField])) {
      historyPromises.push(ticketRepo.addHistory({
        ticketId: id,
        changedBy: user.id,
        changedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        fieldName: field,
        oldValue: String(ticket[dbField] || ''),
        newValue: String(newVal),
        changeType: field === 'status' ? 'status' : field === 'assigned_to' ? 'assign' : 'update',
      }));
    }
  }

  // Set timestamps for status changes
  const dbFields = { ...fields };
  if (fields.status === 'resolved' && !ticket.resolved_at) dbFields.resolved_at = new Date();
  if (fields.status === 'closed' && !ticket.closed_at) dbFields.closed_at = new Date();
  dbFields.updated_by = user.id;

  const [updated] = await Promise.all([
    ticketRepo.update(id, dbFields, user.id),
    ...historyPromises,
  ]);

  return updated;
};

const addComment = async (ticketId, data, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  // Customers can't add internal notes
  if (user.role === ROLES.CUSTOMER && data.isInternal) {
    throw new ForbiddenError('Customers cannot add internal notes');
  }

  const authorType = user.role === ROLES.CUSTOMER ? 'customer' : 'agent';

  const comment = await ticketRepo.addComment({
    ticketId,
    authorId: user.id,
    authorType,
    authorName: `${user.firstName} ${user.lastName}`,
    authorEmail: user.email,
    body: data.body,
    isInternal: data.isInternal || false,
    isSystem: false,
  });

  // Track first response time
  if (!ticket.first_response_at && authorType === 'agent') {
    await ticketRepo.update(ticketId, { first_response_at: new Date() }, user.id);
  }

  await ticketRepo.addHistory({
    ticketId,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName: data.isInternal ? 'internal_note' : 'public_reply',
    oldValue: null,
    newValue: `Comment #${comment.id} added`,
    changeType: 'comment',
  });

  return comment;
};

const assignTicket = async (ticketId, assignedTo, teamId, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  const updated = await ticketRepo.update(
    ticketId,
    { assigned_to: assignedTo, team_id: teamId || ticket.team_id, status: ticket.status === 'new' ? 'open' : ticket.status },
    user.id
  );

  await ticketRepo.addHistory({
    ticketId,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName: 'assigned_to',
    oldValue: String(ticket.assigned_to || ''),
    newValue: String(assignedTo),
    changeType: 'assign',
  });

  return updated;
};

const escalateTicket = async (ticketId, reason, escalateTo, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  const updated = await ticketRepo.update(
    ticketId,
    { status: 'escalated', is_escalated: 1, escalated_at: new Date(), escalated_to: escalateTo || null },
    user.id
  );

  await ticketRepo.addHistory({
    ticketId,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName: 'escalation',
    oldValue: 'not_escalated',
    newValue: reason || 'Escalated',
    changeType: 'escalate',
  });

  return updated;
};

const addTags = async (ticketId, tagIds, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');
  await ticketRepo.addTags(ticketId, tagIds, user.id);
  return ticketRepo.getTags(ticketId);
};

const submitCSAT = async (ticketId, score, comment, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');
  if (!['resolved', 'closed'].includes(ticket.status)) {
    throw new ValidationError('CSAT can only be submitted for resolved or closed tickets');
  }
  return ticketRepo.update(ticketId, { csat_score: score, csat_comment: comment || null }, user.id);
};

module.exports = {
  createTicket, getTickets, getTicketById, updateTicket,
  addComment, assignTicket, escalateTicket, addTags, submitCSAT,
};
