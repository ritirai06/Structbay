import { useState } from 'react';
import { HelpCircle, MessageSquare, Send, Phone, Mail, Clock, ChevronDown } from 'lucide-react';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

const FAQS = [
  {
    q: 'How do I upload an invoice?',
    a: 'Go to Assigned Orders, select the order, and click "Upload Invoice". Fill in invoice details and upload the PDF. StructBay will review within 24 hours.',
  },
  {
    q: 'When will StructBay pick up my material?',
    a: 'After you submit pickup details via "Warehouse Details", StructBay logistics will schedule collection within 24–48 hours based on your availability.',
  },
  {
    q: 'How do I download shipping documents?',
    a: 'Navigate to Document Center from the sidebar. All StructBay-generated documents — e-way bills, shipping labels, packing slips — are available for download.',
  },
  {
    q: 'What if I cannot fulfill the complete quantity?',
    a: 'Contact StructBay support immediately. Partial fulfillment requires prior approval from the operations team.',
  },
  {
    q: 'Can I edit product details or pricing?',
    a: 'No. As per StructBay policy, vendors cannot edit product details, pricing, or inventory. You only manage fulfillment of assigned orders.',
  },
  {
    q: 'How do I update dispatch status after shipping?',
    a: 'Go to Dispatch Management, select your order, click "Update Status" tab, and update to Dispatched with tracking details.',
  },
];

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
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: SB.orange, transform: open ? 'rotate(180deg)' : 'none' }}
        />
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
  const [showTicket, setShowTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowTicket(false);
      setSubmitted(false);
      setSubject(''); setDescription('');
    }, 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: SB.color }}>Support Center</h1>
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

      {/* Ticket Form */}
      {showTicket && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>New Support Ticket</h2>
          {submitted ? (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <p className="text-sm font-semibold text-green-400">Ticket submitted! Our team will respond within 24–48 hours.</p>
            </div>
          ) : (
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
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                  <Send className="w-4 h-4" /> Submit Ticket
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact Info */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Contact StructBay</h2>
          {[
            { icon: Phone, label: 'Phone', value: '1800-123-4567', sub: 'Mon–Sat, 9 AM – 6 PM' },
            { icon: Mail,  label: 'Email', value: 'vendor.support@structbay.com', sub: '24–48 hour response' },
            { icon: Clock, label: 'Hours', value: 'Monday – Saturday', sub: '9:00 AM – 6:00 PM IST' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--sb-orange-subtle)' }}>
                <Icon className="w-4 h-4" style={{ color: SB.orange }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>{label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: SB.color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: SB.faint }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" style={{ color: SB.orange }} />
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Frequently Asked Questions</h2>
          </div>
          {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
        </div>
      </div>
    </div>
  );
}
