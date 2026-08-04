import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { adminPath } from "../../lib/portalRoutes";
import { adminFetch } from "../../lib/adminApi";

export function AdminVendorChatPage() {
  const { vendorOrderId } = useParams();
  const location = useLocation();
  const [chat, setChat] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const backUrl = new URLSearchParams(location.search).get("back") || adminPath("orders");

  const load = () => {
    if (!vendorOrderId) return;
    setLoading(true);
    adminFetch(`/vendor-chat/${vendorOrderId}`)
      .then((d: any) => setChat(d.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [vendorOrderId]);

  const send = async () => {
    if (!vendorOrderId || !text.trim()) return;
    setSending(true);
    setErr(null);
    try {
      await adminFetch(`/vendor-chat/${vendorOrderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });
      setText("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Send failed");
    }
    setSending(false);
  };

  return (
    <div className="admin-page max-w-3xl mx-auto">
      <Link to={backUrl} className="inline-flex items-center gap-2 text-sm text-sb-ink/55 hover:text-sb-ink mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-xl font-semibold text-sb-ink mb-1">Vendor Chat</h1>


      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sb-orange" /></div>
      ) : err && !chat ? (
        <p className="text-sb-ink/55 text-sm">{err}</p>
      ) : (
        <>
          <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 space-y-3 max-h-[55vh] overflow-y-auto mb-4">
            {(chat?.messages?.length ? chat.messages : []).map((m: any, i: number) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm max-w-[90%] ${
                  m.senderType === "ADMIN"
                    ? "ml-auto bg-sb-orange/15 text-sb-ink border border-sb-orange/25"
                    : "mr-auto bg-white text-sb-ink border border-sb-ink/10"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">{m.senderType}</p>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="text-[10px] opacity-40 mt-1">
                  {m.sentAt ? new Date(m.sentAt).toLocaleString("en-IN") : ""}
                </p>
              </div>
            ))}
            {(!chat?.messages || chat.messages.length === 0) && (
              <p className="text-sm text-sb-ink/50 text-center py-8">No messages yet. Chat with the vendor about this sub-order.</p>
            )}
          </div>
          {err && <p className="text-sb-ink/55 text-xs mb-2">{err}</p>}
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              className="flex-1 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={send}
              className="self-end px-4 py-2 rounded-lg bg-sb-orange text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
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
