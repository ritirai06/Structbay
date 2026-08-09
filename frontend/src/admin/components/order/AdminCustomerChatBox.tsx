import { useEffect, useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { adminFetch } from "../../../lib/adminApi";
import { WorkflowCard } from "./orderDetailShared";

export function AdminCustomerChatBox({ orderId }: { orderId: string }) {
  const [chat, setChat] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const load = async (isPoll = false) => {
    if (!orderId) return;
    if (!isPoll) setLoading(true);
    try {
      const d = await adminFetch(`/order-chat/${orderId}`);
      setChat(d.data);
      if (err) setErr(null);
    } catch (e: any) {
      if (!isPoll) setErr(e.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 3000); // poll every 3 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chat?.messages?.length]);

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
      await load(true);
    } catch (e: any) {
      setErr(e.message || "Send failed");
    }
    setSending(false);
  };

  return (
    <WorkflowCard title="Customer Chat" variant="muted">
      {loading && !chat ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-sb-orange" /></div>
      ) : (
        <div className="flex flex-col h-[300px]">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 p-2 mb-3 bg-white/50 rounded-lg border border-sb-ink/5">
            {(chat?.messages?.length ? chat.messages : []).map((m: any, i: number) => (
              <div
                key={i}
                className={`rounded-md px-2.5 py-1.5 text-xs max-w-[85%] ${
                  m.senderType === "ADMIN"
                    ? "ml-auto bg-[#E85A00] text-white rounded-tr-none"
                    : "mr-auto bg-white text-sb-ink border border-sb-ink/10 rounded-tl-none"
                }`}
              >
                <div className="flex justify-between items-end gap-2 mb-0.5">
                  <span className={`font-semibold opacity-80 ${m.senderType === "ADMIN" ? "text-white" : "text-[#E85A00]"}`}>
                    {m.senderType === "ADMIN" ? "You" : "Customer"}
                  </span>
                  <span className="text-[9px] opacity-60">
                    {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
            {(!chat?.messages || chat.messages.length === 0) && (
              <p className="text-xs text-sb-ink/50 text-center py-4">No messages yet.</p>
            )}
          </div>
          {err && <p className="text-red-500 text-[10px] mb-1">{err}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Reply..."
              className="flex-1 bg-white border border-sb-ink/10 rounded-lg px-2.5 py-1.5 text-xs text-sb-ink focus:outline-none focus:border-sb-orange"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={send}
              className="px-3 py-1.5 rounded-lg bg-sb-orange text-white font-semibold text-xs disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </WorkflowCard>
  );
}
