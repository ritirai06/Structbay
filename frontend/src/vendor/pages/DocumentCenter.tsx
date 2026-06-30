import { useState, useEffect } from 'react';
import { Upload, Download, Trash2, FileText, FolderOpen, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../lib/api';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

const DOC_TYPES = [
  { value: 'gst_certificate',        label: 'GST Certificate' },
  { value: 'pan_card',               label: 'PAN Card' },
  { value: 'business_registration',  label: 'Business Registration' },
  { value: 'cancelled_cheque',       label: 'Cancelled Cheque' },
  { value: 'bank_statement',         label: 'Bank Statement' },
  { value: 'compliance_certificate', label: 'Compliance Certificate' },
  { value: 'vendor_agreement',       label: 'Vendor Agreement' },
  { value: 'other',                  label: 'Other' },
];

function statusColor(status: string) {
  if (status === 'verified') return { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.25)' };
  if (status === 'rejected') return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' };
  if (status === 'expired')  return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' };
  return { bg: 'rgba(156,163,175,0.1)', color: SB.muted, border: 'rgba(156,163,175,0.2)' };
}

export function DocumentCenter() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Upload form state
  const [docType, setDocType] = useState('gst_certificate');
  const [docName, setDocName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getDocuments(filterType || undefined);
      setDocs(res.data ?? []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterType]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg({ type: 'error', text: 'Please select a file.' }); return; }
    setSubmitting(true); setMsg(null);
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('documentType', docType);
      if (docName)   form.append('documentName', docName);
      if (docNumber) form.append('documentNumber', docNumber);
      if (issueDate) form.append('issueDate', issueDate);
      if (expiryDate)form.append('expiryDate', expiryDate);
      if (notes)     form.append('notes', notes);
      await api.uploadDocument(form);
      setMsg({ type: 'success', text: 'Document uploaded successfully!' });
      setFile(null); setDocName(''); setDocNumber(''); setIssueDate(''); setExpiryDate(''); setNotes('');
      setShowUpload(false);
      load();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Upload failed.' });
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(id);
      setDocs(d => d.filter(x => x._id !== id));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Delete failed.' });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>Document Center</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Upload business documents and download Structbay-shared files.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUpload(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className={`text-sm font-medium flex-1 ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4" style={{ color: SB.faint }} /></button>
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Upload New Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
                  Document Type <span className="text-red-400">*</span>
                </label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className={inputCls} style={inputStyle}>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Document Name</label>
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)}
                  placeholder="e.g. GST Certificate 2025" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Document Number</label>
                <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)}
                  placeholder="GST/PAN/Reg number" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Expiry Date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
                File <span className="text-red-400">*</span>
              </label>
              <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl cursor-pointer transition-all"
                style={{ border: `2px dashed ${file ? 'var(--sb-orange)' : SB.border}`, background: file ? 'var(--sb-orange-subtle)' : SB.bg }}>
                <input type="file" accept="application/pdf,image/*,.doc,.docx" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file
                  ? <><FileText className="w-8 h-8" style={{ color: SB.orange }} /><p className="text-sm font-medium text-center" style={{ color: SB.color }}>{file.name}</p><p className="text-xs" style={{ color: SB.muted }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p></>
                  : <><Upload className="w-8 h-8" style={{ color: SB.faint }} /><p className="text-sm" style={{ color: SB.faint }}>PDF, Image, Word · Max 20MB</p></>
                }
              </label>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpload(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: SB.bg, color: SB.muted, border: `1px solid ${SB.border}` }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                {submitting ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="max-w-xs">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.color }}
        >
          <option value="">All document types</option>
          {DOC_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${SB.border}` }}>
          <FolderOpen className="w-4 h-4" style={{ color: SB.orange }} />
          <h2 className="vendor-section-title" style={{ color: SB.muted }}>Your Documents</h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: SB.bg, color: SB.muted }}>{docs.length}</span>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <FolderOpen className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
            <p className="font-semibold" style={{ color: SB.muted }}>No documents uploaded yet</p>
            <p className="text-sm mt-1" style={{ color: SB.faint }}>Upload your business documents to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${SB.border}` }}>
                  {['Document', 'Type', 'Number', 'Expiry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: SB.faint }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const sc = statusColor(doc.status);
                  return (
                    <tr key={doc._id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(55,65,81,0.3)' }}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--sb-orange-subtle)' }}>
                            <FileText className="w-4 h-4" style={{ color: SB.orange }} />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: SB.color }}>{doc.documentName}</p>
                            <p className="text-xs mt-0.5" style={{ color: SB.faint }}>
                              {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                        {DOC_TYPES.find(t => t.value === doc.documentType)?.label ?? doc.documentType}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>{doc.documentNumber || '—'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg transition-colors" title="Download"
                            style={{ color: SB.orange, background: 'var(--sb-orange-subtle)' }}>
                            <Download className="w-4 h-4" />
                          </a>
                          {doc.status === 'pending' && (
                            <button onClick={() => handleDelete(doc._id)}
                              className="p-1.5 rounded-lg transition-colors" title="Delete"
                              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
        <div className="text-xs" style={{ color: SB.muted }}>
          <p className="font-bold mb-1" style={{ color: SB.orange }}>Document Review Process</p>
          <p>Uploaded documents are reviewed by Structbay admin. Documents in "pending" status can be deleted and re-uploaded. Verified documents cannot be deleted. For download of Structbay-shared files (E-Way Bills, Shipping Labels), visit the Order Details page.</p>
        </div>
      </div>
    </div>
  );
}
