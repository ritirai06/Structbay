import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { vendorPath } from "../../lib/portalRoutes";
import { api } from "../lib/api";

export function VendorChatPage() {
  const { orderId } = useParams();
  const [chat, setChat] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    if (!orderId) return;
    setLoading(true);
    api.getVendorChat(orderId)
      .then((d: any) => setChat(d.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orderId]);

  const send = async () => {
    if (!orderId || !text.trim()) return;
    setSending(true);
    setErr(null);
    try {
      await api.postVendorChatMessage(orderId, text.trim());
      setText("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Send failed");
    }
    setSending(false);
  };

  const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <Link to={vendorPath("orders", orderId!)} className="inline-flex items-center gap-2 text-sm text-sb-ink/55 hover:text-sb-ink mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to order
      </Link>
      <h1 className="text-xl font-semibold text-sb-ink mb-1">Chat with Admin</h1>


      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sb-orange" /></div>
      ) : err && !chat ? (
        <p className="text-sm" style={{ color: '#EF4444' }}>{err}</p>
      ) : (
        <>
          <div className="rounded-xl p-4 space-y-3 max-h-[55vh] overflow-y-auto mb-4" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            {(chat?.messages?.length ? chat.messages : []).map((m: any, i: number) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm max-w-[90%] ${
                  m.senderType === "VENDOR"
                    ? "ml-auto"
                    : "mr-auto"
                }`}
                style={{
                  background: m.senderType === "VENDOR" ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.04)',
                  color: m.senderType === "VENDOR" ? SB.color : '#000000',
                  border: m.senderType === "VENDOR" ? '1px solid rgba(249,115,22,0.25)' : `1px solid ${SB.border}`
                }}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">{m.senderType}</p>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="text-[10px] opacity-40 mt-1">
                  {m.sentAt ? new Date(m.sentAt).toLocaleString("en-IN") : ""}
                </p>
              </div>
            ))}
            {(!chat?.messages || chat.messages.length === 0) && (
              <p className="text-sm text-center py-8" style={{ color: SB.faint }}>No messages yet. Message the admin regarding this order.</p>
            )}
          </div>
          {err && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{err}</p>}
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={send}
              className="self-end px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
              style={{ background: SB.orange }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
