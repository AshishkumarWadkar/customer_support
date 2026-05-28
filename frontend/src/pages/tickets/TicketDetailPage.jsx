import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import {
  ArrowLeftIcon,
  LockClosedIcon,
  UserCircleIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ── Shared constants ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  new:              'bg-violet-100 text-violet-700',
  open:             'bg-blue-100 text-blue-700',
  in_progress:      'bg-cyan-100 text-cyan-700',
  pending_customer: 'bg-amber-100 text-amber-700',
  escalated:        'bg-red-100 text-red-700',
  resolved:         'bg-green-100 text-green-700',
  closed:           'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
};

const CLOSED_STATUSES = ['resolved', 'closed'];

const LINK_TYPES = [
  { value: 'related',    label: 'Related' },
  { value: 'duplicate',  label: 'Duplicate' },
  { value: 'parent',     label: 'Parent of' },
  { value: 'child',      label: 'Child of' },
  { value: 'blocks',     label: 'Blocks' },
  { value: 'blocked_by', label: 'Blocked by' },
];

const LINK_TYPE_STYLES = {
  related:    'bg-slate-100 text-slate-600',
  duplicate:  'bg-purple-100 text-purple-700',
  parent:     'bg-blue-100 text-blue-700',
  child:      'bg-cyan-100 text-cyan-700',
  blocks:     'bg-red-100 text-red-700',
  blocked_by: 'bg-orange-100 text-orange-700',
};

// ── Reassign Panel ────────────────────────────────────────────────────────────
const ReassignPanel = ({ ticket, onReassigned }) => {
  const { user } = useAuth();
  const [open, setOpen]               = useState(false);
  const [agents, setAgents]           = useState([]);
  const [selectedAgent, setSelected]  = useState('');
  const [saving, setSaving]           = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const canReassign =
    ['SUPER_ADMIN', 'MANAGER'].includes(user?.role) &&
    !CLOSED_STATUSES.includes(ticket.status);

  useEffect(() => {
    if (!open) return;
    axiosInstance
      .get('/tickets/agents')
      .then(({ data }) => setAgents(data.data))
      .catch(() => toast.error('Failed to load agents'));
  }, [open]);

  const filtered = agents.filter((a) =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(`/tickets/${ticket.id}/assign`, {
        assignedTo: Number(selectedAgent),
      });
      toast.success('Ticket reassigned successfully');
      setOpen(false); setSelected(''); setAgentSearch('');
      onReassigned(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reassign ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setOpen(false); setSelected(''); setAgentSearch(''); };
  const currentName  = ticket.agent_first ? `${ticket.agent_first} ${ticket.agent_last}` : 'Unassigned';

  return (
    <div>
      <dt className="text-slate-400 flex items-center justify-between">
        Assigned To
        {canReassign && !open && (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            title="Reassign ticket">
            <PencilSquareIcon className="h-3.5 w-3.5" /> Reassign
          </button>
        )}
      </dt>

      {!open && (
        <dd className="flex items-center gap-2 mt-0.5">
          <UserCircleIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="font-medium text-slate-800">{currentName}</span>
        </dd>
      )}

      {open && (
        <dd className="mt-2 space-y-2">
          <input type="text" placeholder="Search agents..." value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)} autoFocus
            className="w-full h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select size={Math.min(filtered.length || 1, 6)} value={selectedAgent}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {filtered.length === 0 && <option disabled value="">No agents found</option>}
            {filtered.map((a) => (
              <option key={a.id} value={a.id}>
                {a.first_name} {a.last_name}{a.open_ticket_count > 0 ? ` (${a.open_ticket_count} open)` : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!selectedAgent || saving}
              className="flex items-center gap-1 px-3 h-7 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              <CheckIcon className="h-3 w-3" /> {saving ? 'Saving…' : 'Confirm'}
            </button>
            <button onClick={handleCancel}
              className="flex items-center gap-1 px-3 h-7 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50">
              <XMarkIcon className="h-3 w-3" /> Cancel
            </button>
          </div>
        </dd>
      )}
    </div>
  );
};

// ── Linked Tickets Panel ──────────────────────────────────────────────────────
const LinkedTicketsPanel = ({ ticketId, links: initialLinks, canEdit }) => {
  const [links, setLinks]             = useState(initialLinks || []);
  const [showForm, setShowForm]       = useState(false);
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [selected, setSelected]       = useState(null);   // full result object
  const [linkType, setLinkType]       = useState('related');
  const [saving, setSaving]           = useState(false);
  const [removingId, setRemovingId]   = useState(null);
  const [dropdownOpen, setDropdown]   = useState(false);
  const debounceRef                   = useRef(null);
  const inputRef                      = useRef(null);
  const dropdownRef                   = useRef(null);

  // Keep local links in sync when parent re-fetches ticket
  useEffect(() => { setLinks(initialLinks || []); }, [initialLinks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axiosInstance.get(
          `/tickets/search?q=${encodeURIComponent(query)}&exclude=${ticketId}`
        );
        setResults(data.data || []);
        setDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(debounceRef.current);
  }, [query, ticketId]);

  const handleSelectResult = (result) => {
    setSelected(result);
    setQuery(`${result.ticket_number} — ${result.subject}`);
    setDropdown(false);
  };

  const handleClearSelection = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setDropdown(false);
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(`/tickets/${ticketId}/links`, {
        linkedTicketId: selected.id,
        linkType,
      });
      setLinks(data.data);
      toast.success(`Linked to ${selected.ticket_number}`);
      // Reset form
      setShowForm(false); setSelected(null); setQuery('');
      setResults([]); setLinkType('related');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create link');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId) => {
    setRemovingId(linkId);
    try {
      const { data } = await axiosInstance.delete(`/tickets/${ticketId}/links/${linkId}`);
      setLinks(data.data);
      toast.success('Link removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove link');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false); setSelected(null); setQuery('');
    setResults([]); setLinkType('related');
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <LinkIcon className="h-4 w-4 text-slate-400" />
          Linked Tickets
          {links.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-normal">
              {links.length}
            </span>
          )}
        </h3>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Link Ticket
          </button>
        )}
      </div>

      {/* Add link form */}
      {showForm && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          {/* Live-search input */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by ticket ID, title, or assignee…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => results.length > 0 && setDropdown(true)}
                className="w-full h-9 pl-8 pr-8 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {/* Clear / spinner */}
              {searching && (
                <svg className="absolute right-2.5 h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {selected && !searching && (
                <button onClick={handleClearSelection} className="absolute right-2.5 text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {dropdownOpen && results.length > 0 && (
              <ul className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleSelectResult(r); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm flex items-start gap-3"
                    >
                      <span className="font-mono text-xs text-slate-400 mt-0.5 flex-shrink-0 w-28">{r.ticket_number}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-slate-800 truncate">{r.subject}</span>
                        <span className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                            {r.status?.replace(/_/g, ' ')}
                          </span>
                          {r.agent_first && (
                            <span className="text-xs text-slate-400">{r.agent_first} {r.agent_last}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {dropdownOpen && results.length === 0 && query.trim().length >= 2 && !searching && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-md shadow px-3 py-3 text-sm text-slate-400">
                No tickets found
              </div>
            )}
          </div>

          {/* Link type selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 flex-shrink-0">Relationship:</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value)}
              className="flex-1 h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Selected ticket preview */}
          {selected && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <LinkIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="font-mono text-xs text-blue-500">{selected.ticket_number}</span>
              <span className="text-blue-800 font-medium truncate">{selected.subject}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!selected || saving}
              className="flex items-center gap-1 px-3 h-8 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              {saving ? 'Linking…' : 'Confirm Link'}
            </button>
            <button
              onClick={handleCancelForm}
              className="flex items-center gap-1 px-3 h-8 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
            >
              <XMarkIcon className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <p className="text-xs text-slate-400 py-1">No linked tickets</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id}
              className="flex items-start gap-2 p-2.5 rounded-md border border-slate-100 bg-slate-50 hover:bg-white transition-colors group">
              {/* Relationship badge */}
              <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${LINK_TYPE_STYLES[link.link_type] || 'bg-slate-100 text-slate-600'}`}>
                {LINK_TYPES.find((t) => t.value === link.link_type)?.label || link.link_type}
              </span>

              {/* Ticket info — clickable */}
              <Link
                to={ROUTES.TICKET_DETAIL(link.linked_ticket_id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 hover:underline"
              >
                <span className="font-mono text-xs text-slate-400">{link.linked_ticket_number}</span>
                <span className="ml-2 text-sm font-medium text-slate-800 truncate block leading-tight">
                  {link.linked_ticket_subject}
                </span>
                <span className="flex items-center gap-2 mt-1">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[link.linked_ticket_status] || 'bg-slate-100'}`}>
                    {link.linked_ticket_status?.replace(/_/g, ' ')}
                  </span>
                  {link.linked_agent_first && (
                    <span className="text-xs text-slate-400">
                      {link.linked_agent_first} {link.linked_agent_last}
                    </span>
                  )}
                </span>
              </Link>

              {/* Remove button */}
              {canEdit && (
                <button
                  onClick={() => handleRemove(link.id)}
                  disabled={removingId === link.id}
                  title="Remove link"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                >
                  {removingId === link.id
                    ? <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    : <TrashIcon className="h-3.5 w-3.5" />
                  }
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setInternal] = useState(false);
  const [submitting, setSubmit]   = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(`/tickets/${id}`);
      setTicket(data.data);
    } catch {
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleReassigned = useCallback((updated) => {
    setTicket((prev) => ({
      ...prev,
      assigned_to: updated.assigned_to,
      agent_first: updated.agent_first,
      agent_last:  updated.agent_last,
      agent_email: updated.agent_email,
      team_id:     updated.team_id,
      team_name:   updated.team_name,
      status:      updated.status,
    }));
  }, []);

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setSubmit(true);
    try {
      await axiosInstance.post(`/tickets/${id}/comments`, { body: replyBody, isInternal });
      setReplyBody('');
      toast.success('Reply sent');
      fetchTicket();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSubmit(false);
    }
  };

  const canEdit = user && ['SUPER_ADMIN', 'MANAGER', 'AGENT'].includes(user.role);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (!ticket) {
    return <div className="p-6 text-center text-slate-500">Ticket not found.</div>;
  }

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(ROUTES.TICKETS)} className="p-2 hover:bg-slate-100 rounded-md">
          <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-slate-400">{ticket.ticket_number}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status?.replace(/_/g, ' ')}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
              {ticket.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Conversation ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original message */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                {ticket.customer_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{ticket.customer_name}</p>
                <p className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</div>
          </div>

          {/* Comments */}
          {ticket.comments?.map((comment) => (
            <div key={comment.id}
              className={`bg-white rounded-lg border p-4 ${comment.is_internal ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {comment.is_internal && (
                  <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                    <LockClosedIcon className="h-3 w-3" /> Internal Note
                  </span>
                )}
                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold ml-auto">
                  {comment.author_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{comment.author_name}</p>
                  <p className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: comment.body }} />
            </div>
          ))}

          {/* Reply Box */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setInternal(false)}
                className={`px-3 h-8 rounded text-sm font-medium ${!isInternal ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Public Reply
              </button>
              <button onClick={() => setInternal(true)}
                className={`px-3 h-8 rounded text-sm font-medium ${isInternal ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Internal Note
              </button>
            </div>
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
              placeholder={isInternal ? 'Add an internal note...' : 'Write your reply...'}
              className="w-full border border-slate-300 rounded-md p-3 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end mt-2">
              <button onClick={submitReply} disabled={submitting || !replyBody.trim()}
                className="px-4 h-9 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {submitting ? 'Sending…' : isInternal ? 'Save Note' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Meta + Linked Tickets ── */}
        <div className="space-y-4">
          {/* Ticket Details card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Ticket Details</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-slate-400">Customer</dt><dd className="font-medium">{ticket.customer_name}</dd></div>
              <div><dt className="text-slate-400">Email</dt><dd className="text-blue-600">{ticket.customer_email}</dd></div>
              <div><dt className="text-slate-400">Channel</dt><dd>{ticket.channel_name || '—'}</dd></div>
              <div><dt className="text-slate-400">Department</dt><dd>{ticket.dept_name || '—'}</dd></div>
              <div><dt className="text-slate-400">Team</dt><dd>{ticket.team_name || '—'}</dd></div>
              <ReassignPanel ticket={ticket} onReassigned={handleReassigned} />
              <div><dt className="text-slate-400">Category</dt><dd>{ticket.category || '—'}</dd></div>
              <div><dt className="text-slate-400">Created</dt><dd>{new Date(ticket.created_at).toLocaleString()}</dd></div>
              {ticket.due_at && (
                <div><dt className="text-slate-400">SLA Due</dt><dd className="text-red-600">{new Date(ticket.due_at).toLocaleString()}</dd></div>
              )}
            </dl>
          </div>

          {/* Tags */}
          {ticket.tags?.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color || '#6B7280' }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Linked Tickets Panel ── */}
          <LinkedTicketsPanel
            ticketId={Number(id)}
            links={ticket.links}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
