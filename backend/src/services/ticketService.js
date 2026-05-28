const ticketRepo = require('../repositories/ticketRepository');
const userRepo = require('../repositories/userRepository');
const slaService = require('./slaService');
const { NotFoundError, ForbiddenError, ValidationError } = require('../middlewares/errorMiddleware');
const { TICKET_STATUS_TRANSITIONS } = require('../constants/ticketStatus');
const { ROLES } = require('../constants/roles');
const { emitTicketReassigned } = require('../config/socket');
const logger = require('../utils/logger');

// Ticket statuses that should pause the SLA timer
const SLA_PAUSE_STATUSES = ['pending_customer'];
// Ticket statuses that should resume the SLA timer (active work states)
const SLA_RESUME_STATUSES = ['open', 'in_progress', 'escalated'];

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

  // Initialise SLA timer if a policy was assigned
  if (ticket.sla_policy_id) {
    try {
      await slaService.initSlaTimer(ticket.id, ticket.sla_policy_id, ticket.created_at);
    } catch (slaErr) {
      logger.error(`Failed to init SLA timer for ticket ${ticket.id}: ${slaErr.message}`);
    }
  }

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

  const [comments, history, tags, attachments, links] = await Promise.all([
    ticketRepo.getComments(ticket.id, user.role !== ROLES.CUSTOMER),
    ticketRepo.getHistory(ticket.id),
    ticketRepo.getTags(ticket.id),
    ticketRepo.getAttachments(ticket.id),
    ticketRepo.getLinks(ticket.id),
  ]);

  return { ...ticket, comments, history, tags, attachments, links };
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

  // SLA timer state changes triggered by status transitions
  if (fields.status && fields.status !== ticket.status) {
    try {
      if (SLA_PAUSE_STATUSES.includes(fields.status)) {
        await slaService.pauseTimer(id);
      } else if (SLA_RESUME_STATUSES.includes(fields.status) && SLA_PAUSE_STATUSES.includes(ticket.status)) {
        await slaService.resumeTimer(id);
      } else if ((fields.status === 'resolved' || fields.status === 'closed')) {
        await slaService.recordRtAchieved(id, dbFields.resolved_at || new Date());
      }
    } catch (slaErr) {
      logger.error(`SLA state update failed for ticket ${id} on status change: ${slaErr.message}`);
    }
  }

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
    const frtTime = new Date();
    await ticketRepo.update(ticketId, { first_response_at: frtTime }, user.id);
    // Record FRT achievement in SLA timer
    try {
      await slaService.recordFrtAchieved(ticketId, frtTime);
    } catch (slaErr) {
      logger.error(`Failed to record SLA FRT for ticket ${ticketId}: ${slaErr.message}`);
    }
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

// Statuses where reassignment is not allowed
const CLOSED_STATUSES = ['resolved', 'closed'];

const assignTicket = async (ticketId, assignedTo, teamId, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  // ── RBAC: only MANAGER and SUPER_ADMIN can reassign ──────────────
  // Agents can only see the assign endpoint but cannot reassign a ticket
  // that is already assigned to someone else.
  if (user.role === ROLES.AGENT && ticket.assigned_to && ticket.assigned_to !== user.id) {
    throw new ForbiddenError('Agents cannot reassign tickets assigned to other agents');
  }

  // ── Status guard: cannot reassign resolved or closed tickets ──────
  if (CLOSED_STATUSES.includes(ticket.status)) {
    throw new ValidationError(`Cannot reassign a ticket with status '${ticket.status}'`);
  }

  // ── Target agent must exist and be active ────────────────────────
  const targetAgent = await userRepo.findById(assignedTo);
  if (!targetAgent || !targetAgent.is_active) {
    throw new NotFoundError('Agent');
  }
  if (![ROLES.AGENT, ROLES.MANAGER, ROLES.SUPER_ADMIN].includes(targetAgent.role)) {
    throw new ValidationError('Tickets can only be assigned to agents or managers');
  }

  const previousAssignedTo = ticket.assigned_to;
  const previousAgentName  = ticket.agent_first
    ? `${ticket.agent_first} ${ticket.agent_last}`
    : 'Unassigned';
  const newAgentName = `${targetAgent.first_name} ${targetAgent.last_name}`;

  // Transition status from 'new' → 'open' on first assignment
  const newStatus = ticket.status === 'new' ? 'open' : ticket.status;

  const updated = await ticketRepo.update(
    ticketId,
    {
      assigned_to: assignedTo,
      team_id:     teamId ?? ticket.team_id,
      status:      newStatus,
    },
    user.id
  );

  await ticketRepo.addHistory({
    ticketId,
    changedBy:     user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName:     'assigned_to',
    oldValue:      previousAssignedTo ? `${previousAgentName} (id:${previousAssignedTo})` : 'Unassigned',
    newValue:      `${newAgentName} (id:${assignedTo})`,
    changeType:    'assign',
  });

  // ── Real-time broadcast to all connected staff ────────────────────
  emitTicketReassigned(ticketId, {
    ticketNumber:      updated.ticket_number,
    assignedTo:        assignedTo,
    agentFirstName:    targetAgent.first_name,
    agentLastName:     targetAgent.last_name,
    teamId:            updated.team_id,
    status:            newStatus,
    reassignedBy:      user.id,
    reassignedByName:  `${user.firstName} ${user.lastName}`,
  });

  logger.info(
    `Ticket ${updated.ticket_number} reassigned from "${previousAgentName}" to "${newAgentName}" by user ${user.id}`
  );

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
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw new ValidationError('tagIds must be a non-empty array');
  }
  const ids = tagIds.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ValidationError('All tagIds must be positive integers');
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');
  await ticketRepo.addTags(ticketId, ids, user.id);
  return ticketRepo.getTags(ticketId);
};

const VALID_LINK_TYPES = ['related', 'duplicate', 'parent', 'child', 'blocked_by', 'blocks'];

const linkTickets = async (ticketId, linkedTicketId, linkType, user) => {
  const [ticket, target] = await Promise.all([
    ticketRepo.findById(ticketId),
    ticketRepo.findById(linkedTicketId),
  ]);
  if (!ticket) throw new NotFoundError('Ticket');
  if (!target) throw new NotFoundError('Ticket to link');

  if (!VALID_LINK_TYPES.includes(linkType)) {
    throw new ValidationError(`Invalid link type. Allowed: ${VALID_LINK_TYPES.join(', ')}`);
  }

  const links = await ticketRepo.addLink(ticketId, linkedTicketId, linkType, user.id);

  // Audit both tickets
  await Promise.all([
    ticketRepo.addHistory({
      ticketId,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
      fieldName: 'link',
      oldValue: null,
      newValue: `Linked to ${target.ticket_number} as '${linkType}'`,
      changeType: 'tag',
    }),
    ticketRepo.addHistory({
      ticketId: linkedTicketId,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
      fieldName: 'link',
      oldValue: null,
      newValue: `Linked to ${ticket.ticket_number}`,
      changeType: 'tag',
    }),
  ]);

  logger.info(`Ticket ${ticket.ticket_number} linked to ${target.ticket_number} (${linkType}) by user ${user.id}`);
  return links;
};

const unlinkTickets = async (ticketId, linkId, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  // removeLink throws if not found or not belonging to this ticket
  await ticketRepo.removeLink(linkId, ticketId);

  await ticketRepo.addHistory({
    ticketId,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
    fieldName: 'link',
    oldValue: `Link #${linkId}`,
    newValue: 'Removed',
    changeType: 'tag',
  });

  logger.info(`Link #${linkId} removed from ticket ${ticket.ticket_number} by user ${user.id}`);
  return ticketRepo.getLinks(ticketId);
};

const searchTickets = async (query, excludeTicketId) => {
  return ticketRepo.searchForLinking(query, excludeTicketId);
};

const submitCSAT = async (ticketId, score, comment, user) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket');

  if (!['resolved', 'closed'].includes(ticket.status)) {
    throw new ValidationError('CSAT can only be submitted for resolved or closed tickets');
  }

  const numScore = Number(score);
  if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) {
    throw new ValidationError('CSAT score must be an integer between 1 and 5');
  }

  if (ticket.csat_score !== null && ticket.csat_score !== undefined) {
    throw new ValidationError('CSAT feedback has already been submitted for this ticket');
  }

  return ticketRepo.update(ticketId, { csat_score: numScore, csat_comment: comment?.trim() || null }, user.id);
};

module.exports = {
  createTicket, getTickets, getTicketById, updateTicket,
  addComment, assignTicket, escalateTicket, addTags, submitCSAT,
  linkTickets, unlinkTickets, searchTickets,
};
