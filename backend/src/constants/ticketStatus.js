const TICKET_STATUS = {
  NEW: 'new',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING_CUSTOMER: 'pending_customer',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const TICKET_STATUS_TRANSITIONS = {
  new:              ['open', 'in_progress', 'closed'],
  open:             ['in_progress', 'pending_customer', 'escalated', 'resolved', 'closed'],
  in_progress:      ['open', 'pending_customer', 'escalated', 'resolved', 'closed'],
  pending_customer: ['open', 'in_progress', 'resolved', 'closed'],
  escalated:        ['open', 'in_progress', 'resolved', 'closed'],
  resolved:         ['closed', 'open'],
  closed:           ['open'],
};

const TICKET_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

module.exports = { TICKET_STATUS, TICKET_STATUS_TRANSITIONS, TICKET_PRIORITY };
