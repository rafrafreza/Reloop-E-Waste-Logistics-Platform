import { useState, useRef, useEffect } from "react";
import { chatApi } from "../api/endpoints";

export default function AIChatDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hi there! I'm the Reloop AI assistant. I can help you estimate item values, guide you through data wiping, or check the status of your pickups. How can I help today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

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
      const res = await chatApi.sendMessage(userMsg);
      let replyText = res.data?.reply || "No response received";
      if (typeof replyText !== "string") {
        try { replyText = JSON.stringify(replyText); } catch(e) { replyText = "Error parsing response"; }
      }
      setMessages((prev) => [...prev, { role: "ai", content: replyText }]);
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "ai", 
        content: "Oops! I couldn't connect to the backend. Please make sure you have exported GOOGLE_API_KEY in your terminal and the server is running." 
      }]);
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
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

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
