import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { adminPath } from "../../lib/portalRoutes";
import { adminFetch } from "../../lib/adminApi";

export function OrderChatPage() {
  const { orderId } = useParams();
  const [chat, setChat] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    if (!orderId) return;
    setLoading(true);
    adminFetch(`/order-chat/${orderId}`)
      .then((d) => setChat(d.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orderId]);

  const send = async () => {
    if (!orderId || !text.trim()) return;
    setSending(true);
    setErr(null);
    try {
      await adminFetch(`/order-chat/${orderId}/messages`, {
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
    <div className="p-6 bg-[#0D0D0D] min-h-full max-w-3xl mx-auto">
      <Link to={adminPath("orders")} className="inline-flex items-center gap-2 text-sm text-[#D4C4A8]/60 hover:text-[#F4E9D8] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>
      <h1 className="text-xl font-semibold text-[#F4E9D8] mb-1">Order chat</h1>
      <p className="text-xs text-[#D4C4A8]/50 mb-6">Order ID: {orderId}</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FE5E00]" /></div>
      ) : err && !chat ? (
        <p className="text-red-400 text-sm">{err}</p>
      ) : (
        <>
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 space-y-3 max-h-[55vh] overflow-y-auto mb-4">
            {(chat?.messages?.length ? chat.messages : []).map((m: any, i: number) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm max-w-[90%] ${
                  m.senderType === "ADMIN"
                    ? "ml-auto bg-[#FE5E00]/15 text-[#F4E9D8] border border-[#FE5E00]/25"
                    : "mr-auto bg-[#111] text-[#D4C4A8] border border-white/10"
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
              <p className="text-sm text-[#D4C4A8]/50 text-center py-8">No messages yet. Say hello to the customer.</p>
            )}
          </div>
          {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00]"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={send}
              className="self-end px-4 py-2 rounded-lg bg-[#FE5E00] text-[#0D0D0D] font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
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
