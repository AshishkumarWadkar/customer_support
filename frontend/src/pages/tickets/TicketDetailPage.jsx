import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ArrowLeftIcon, PaperClipIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  new: 'bg-violet-100 text-violet-700', open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-cyan-100 text-cyan-700', pending_customer: 'bg-amber-100 text-amber-700',
  escalated: 'bg-red-100 text-red-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTicket = async () => {
    try {
      const { data } = await axiosInstance.get(`/tickets/${id}`);
      setTicket(data.data);
    } catch {
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await axiosInstance.post(`/tickets/${id}/comments`, { body: replyBody, isInternal });
      setReplyBody('');
      toast.success('Reply sent');
      fetchTicket();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  );

  if (!ticket) return (
    <div className="p-6 text-center text-slate-500">Ticket not found.</div>
  );

  return (
    <div className="p-6">
      {/* Header */}
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
        {/* Left: Conversation */}
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
              <button onClick={() => setIsInternal(false)}
                className={`px-3 h-8 rounded text-sm font-medium ${!isInternal ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Public Reply
              </button>
              <button onClick={() => setIsInternal(true)}
                className={`px-3 h-8 rounded text-sm font-medium ${isInternal ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Internal Note
              </button>
            </div>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={isInternal ? 'Add an internal note...' : 'Write your reply...'}
              className="w-full border border-slate-300 rounded-md p-3 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end mt-2">
              <button onClick={submitReply} disabled={submitting || !replyBody.trim()}
                className="px-4 h-9 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {submitting ? 'Sending...' : isInternal ? 'Save Note' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Meta */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Ticket Details</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-slate-400">Customer</dt><dd className="font-medium">{ticket.customer_name}</dd></div>
              <div><dt className="text-slate-400">Email</dt><dd className="text-blue-600">{ticket.customer_email}</dd></div>
              <div><dt className="text-slate-400">Channel</dt><dd>{ticket.channel_name || '—'}</dd></div>
              <div><dt className="text-slate-400">Department</dt><dd>{ticket.dept_name || '—'}</dd></div>
              <div><dt className="text-slate-400">Team</dt><dd>{ticket.team_name || '—'}</dd></div>
              <div><dt className="text-slate-400">Assigned To</dt>
                <dd>{ticket.agent_first ? `${ticket.agent_first} ${ticket.agent_last}` : 'Unassigned'}</dd>
              </div>
              <div><dt className="text-slate-400">Category</dt><dd>{ticket.category || '—'}</dd></div>
              <div><dt className="text-slate-400">Created</dt><dd>{new Date(ticket.created_at).toLocaleString()}</dd></div>
              {ticket.due_at && <div><dt className="text-slate-400">SLA Due</dt><dd className="text-red-600">{new Date(ticket.due_at).toLocaleString()}</dd></div>}
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
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
