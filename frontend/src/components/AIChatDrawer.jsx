import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ children }) => <code className="rounded bg-ink/5 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
  a: ({ children, href }) => <a className="text-circuit underline" href={href} target="_blank" rel="noreferrer">{children}</a>,
};

export default function AIChatDrawer({ open, onClose }) {
  const { user } = useAuth();
  const isConsumer = user?.role === "CONSUMER";
  const [messages, setMessages] = useState(() => [
    {
      role: "ai",
      content: isConsumer
        ? "Hi there! I'm the Reloop AI assistant. I can help you estimate item values, guide you through data wiping, or manage your pickups and addresses. How can I help today?"
        : "Hi there! I'm the Reloop AI assistant. I can answer general questions about Reloop's platform, recycling processes, pricing estimates, and policies. How can I help today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const endRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const recentMessages = messages.slice(-10);
      const res = await chatApi.sendMessage({
        message: userMsg,
        conversation_id: conversationId,
        history: recentMessages.map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      });
      let replyText = res.data?.reply || "No response received";
      if (typeof replyText !== "string") {
        try { replyText = JSON.stringify(replyText); } catch { replyText = "Error parsing response"; }
      }
      setMessages((prev) => [...prev, { role: "ai", content: replyText }]);
      setPendingAction(res.data?.pending_action || null);
      setPendingPreview(res.data?.pending_preview || null);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "ai",
        content: apiErrorMessage(error, "The AI assistant is temporarily unavailable. Check the backend terminal for the Gemini error and try again.")
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction || loading) return;
    setLoading(true);
    try {
      const recentMessages = messages.slice(-10);
      const res = await chatApi.sendMessage({
        message: "Confirm the prepared pickup order.",
        conversation_id: conversationId,
        history: recentMessages.map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
        confirmed_action: pendingAction,
      });
      setMessages((prev) => [...prev, { role: "ai", content: res.data?.reply || "The requested action was completed." }]);
      setPendingAction(null);
      setPendingPreview(null);
      if (res.data?.created_request_id) navigate(`/consumer/requests/${res.data.created_request_id}`);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: error.response?.data?.detail || "I couldn't place that pickup order. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl animate-rise md:w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 bg-paperdim px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-circuit text-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Reloop AI Assistant</h2>
              <p className="text-[11px] font-medium text-circuit">● Online</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-inkfaint hover:bg-ink/5 hover:text-ink transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "ai" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-circuit/10 text-circuit">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                   </svg>
                </div>
              )}
              <div 
                className={`rounded-2xl p-3.5 text-sm shadow-sm border ${
                  msg.role === "user" 
                    ? "rounded-tr-none bg-circuit text-white border-circuit" 
                    : "rounded-tl-none bg-white text-ink border-ink/5"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {pendingAction && (
          <div className="border-t border-ink/10 bg-paperdim px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-ink">
              Confirm {pendingPreview?.operation || "this assistant action"}?
            </p>
            {pendingPreview && (
              <div className="mb-3 text-xs text-inkfaint">
                {(pendingPreview.address?.label || pendingPreview.address?.city) && (
                  <p>
                    {pendingPreview.address?.label && pendingPreview.address?.city
                      ? `${pendingPreview.address.label} in ${pendingPreview.address.city}`
                      : pendingPreview.address.label || pendingPreview.address.city}
                  </p>
                )}
                {pendingPreview.items?.length > 0 && (
                  <p>{pendingPreview.items.length} item type(s)</p>
                )}
                {pendingPreview.request_type && (
                  <p>{pendingPreview.request_type.toLowerCase()} pickup</p>
                )}
                {pendingPreview.items?.map((item, index) => {
                  const weight = item.weight_kg ?? item.actual_weight_kg ?? item.estimated_weight_kg;
                  if (weight == null) return null;
                  return (
                    <p key={`${item.category_id}-${index}`}>
                      Item {index + 1}: {weight} kg ({item.weight_type || (item.actual_weight_kg != null ? "actual" : "estimate")})
                    </p>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={handleConfirm} disabled={loading} className="rounded-full bg-circuit px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                Confirm
              </button>
              <button type="button" onClick={() => { setPendingAction(null); setPendingPreview(null); }} disabled={loading} className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50">
                Abort
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-ink/10 bg-white p-4">
          <form className="relative flex items-center" onSubmit={handleSend}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..." 
              className="w-full rounded-full border border-ink/20 bg-paper px-4 py-2.5 pr-12 text-sm focus:border-circuit focus:outline-none focus:ring-2 focus:ring-circuit/20 transition-all"
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-circuit text-white hover:bg-circuitdark transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
