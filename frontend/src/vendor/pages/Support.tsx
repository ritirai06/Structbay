import { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, Send, Phone, Mail, Clock, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${SB.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors"
        style={{ background: open ? 'var(--sb-orange-subtle)' : SB.bg }}
      >
        <span className="text-sm font-semibold pr-4" style={{ color: SB.color }}>{q}</span>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform" style={{ color: SB.orange, transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2" style={{ background: SB.bg }}>
          <p className="text-sm" style={{ color: SB.muted }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export function Support() {
  const [contact, setContact] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [showTicket, setShowTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getContact().then((r: any) => setContact(r.data)).catch(() => {});
    fetch('/api/v1/cms/vendor-faqs')
      .then(r => r.json())
      .then((r: any) => { if (Array.isArray(r.data)) setFaqs(r.data); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      await api.submitSupportTicket({ subject, priority, description });
      setMsg({ type: 'success', text: 'Ticket submitted! Our team will respond within 24–48 hours.' });
      setSubject(''); setDescription(''); setPriority('medium');
      setTimeout(() => { setShowTicket(false); setMsg(null); }, 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Submission failed. Please try again.' });
    } finally { setSubmitting(false); }
  }

  const phone = contact?.phone || contact?.supportPhone;
  const email = contact?.email || contact?.supportEmail;
  const hours = contact?.businessHours || contact?.hours;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>Support Center</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Get help with your vendor account and operations.</p>
        </div>
        <button
          onClick={() => setShowTicket(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}
        >
          <MessageSquare className="w-4 h-4" />
          Create Ticket
        </button>
      </div>

      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
        </div>
      )}

      {showTicket && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title mb-4" style={{ color: SB.muted }}>New Support Ticket</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
                  Subject <span className="text-red-400">*</span>
                </label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  required placeholder="Brief description of your issue"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
                Description <span className="text-red-400">*</span>
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                required rows={5} placeholder="Please describe your issue in detail, including order numbers if applicable..."
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowTicket(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: SB.bg, color: SB.muted, border: `1px solid ${SB.border}` }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                {submitting ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact Info — from CMS */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title" style={{ color: SB.muted }}>Contact StructBay</h2>
          {phone && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--sb-orange-subtle)' }}>
                <Phone className="w-4 h-4" style={{ color: SB.orange }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Phone</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: SB.color }}>{phone}</p>
              </div>
            </div>
          )}
          {email && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--sb-orange-subtle)' }}>
                <Mail className="w-4 h-4" style={{ color: SB.orange }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Email</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: SB.color }}>{email}</p>
              </div>
            </div>
          )}
          {hours && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--sb-orange-subtle)' }}>
                <Clock className="w-4 h-4" style={{ color: SB.orange }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Hours</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: SB.color }}>{hours}</p>
              </div>
            </div>
          )}
          {!phone && !email && !hours && (
            <p className="text-sm" style={{ color: SB.faint }}>Contact info managed by admin.</p>
          )}
        </div>

        {/* FAQ — from CMS if available, else empty */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" style={{ color: SB.orange }} />
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Frequently Asked Questions</h2>
          </div>
          {faqs.length === 0 ? (
            <p className="text-sm" style={{ color: SB.faint }}>FAQs are managed by admin in the CMS.</p>
          ) : (
            faqs.map((faq: any) => <FaqItem key={faq.question || faq.q} q={faq.question || faq.q} a={faq.answer || faq.a} />)
          )}
        </div>
      </div>
    </div>
  );
}
