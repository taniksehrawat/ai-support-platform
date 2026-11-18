// frontend/src/pages/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  IconSend, IconSparkles, IconUser, IconFile, IconCoffee,
  IconCopy, IconCheck, IconChevronRight, IconUpload,
} from "../components/Icons";

const SAMPLE_QUESTIONS = [
  { icon: "🍽", text: "What sandwiches are available?" },
  { icon: "⏰", text: "What are the mess timings?" },
  { icon: "📋", text: "How do I apply for leave?" },
  { icon: "🏪", text: "Which shops are open now?" },
];

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const updated = [
      ...messages,
      { sender: "user", text: msg, time: timeNow() },
    ];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await API.post("/chat/", { message: msg });
      setMessages([
        ...updated,
        {
          sender: "ai",
          text: res.data.response,
          time: timeNow(),
          menuResults: res.data.menu_results || [],
          sources: res.data.sources || [],
          orderId: res.data.order_id,
        },
      ]);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msgText =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : "Something went wrong. Please try again.";
      setMessages([
        ...updated,
        { sender: "ai", text: `⚠ ${msgText}`, time: timeNow(), isError: true },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      await API.post("/knowledge/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅ ${file.name} uploaded successfully.`);
      setTimeout(() => setUploadStatus(""), 3000);
      e.target.value = null;
    } catch (err) {
      setUploadStatus(`❌ ${err.response?.data?.detail || err.message}`);
    }
  };

  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center mt-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 mb-6 animate-float">
                <IconSparkles className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                Hi {user?.role === "student" ? "there" : user?.role} 👋
              </h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Ask about hostel rules, browse menus, or place food orders. I'll cite my sources for policy answers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => send(q.text)}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                  >
                    <span className="text-2xl">{q.icon}</span>
                    <span className="flex-1 text-sm font-medium text-slate-700">{q.text}</span>
                    <IconChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 mb-6 animate-slide-up ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* AI avatar */}
              {m.sender === "ai" && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <IconSparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[80%] ${m.sender === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`relative px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed group ${
                    m.sender === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm shadow-md shadow-indigo-500/20"
                      : m.isError
                      ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
                      : "bg-white border border-slate-200 text-slate-900 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {m.text}

                  {/* Copy button on AI messages */}
                  {m.sender === "ai" && !m.isError && (
                    <button
                      onClick={() => copyMessage(m.text, i)}
                      className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-md hover:bg-slate-100"
                      title="Copy response"
                    >
                      {copiedId === i ? (
                        <IconCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <IconCopy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sources */}
                {m.sources?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.sources.map((s, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-medium"
                      >
                        <IconFile className="w-3 h-3" />
                        {s.filename}
                      </span>
                    ))}
                  </div>
                )}

                {/* Menu result cards */}
                {m.menuResults?.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {m.menuResults.map((r, j) => (
                      <button
                        key={j}
                        onClick={() => send(`order 1 ${r.item_name} from ${r.shop_name}`)}
                        className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shrink-0">
                          <IconCoffee className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{r.item_name}</p>
                          <p className="text-xs text-slate-500 truncate">{r.shop_name}</p>
                        </div>
                        <p className="text-sm font-bold text-indigo-600 shrink-0">₹{Number(r.price).toFixed(0)}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Order link */}
                {m.orderId && (
                  <Link
                    to="/orders"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    View Order #{m.orderId} <IconChevronRight className="w-3 h-3" />
                  </Link>
                )}

                {/* Timestamp */}
                <p className={`text-xs text-slate-400 mt-1 ${m.sender === "user" ? "pr-1" : "pl-1"}`}>
                  {m.time}
                </p>
              </div>

              {m.sender === "user" && (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">
                  <IconUser className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 mb-6 animate-slide-up">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                <IconSparkles className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1 text-indigo-600">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Upload status */}
      {uploadStatus && (
        <div className="px-4 py-2 text-sm bg-indigo-50 border-t border-indigo-200 text-indigo-700 text-center">
          {uploadStatus}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white/80 backdrop-blur">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="max-w-4xl mx-auto p-4"
        >
          <div className="flex items-end gap-2 bg-white border border-slate-300 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition shadow-sm">
            {isAdmin && (
              <label
                className="p-3 text-slate-400 hover:text-indigo-600 cursor-pointer rounded-l-2xl hover:bg-slate-50 transition"
                title="Upload PDF"
              >
                <IconUpload className="w-5 h-5" />
                <input type="file" accept=".pdf" onChange={upload} className="hidden" />
              </label>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about hostel rules, food, or place an order..."
              disabled={loading}
              className="flex-1 px-2 py-3 bg-transparent text-slate-900 placeholder-slate-400 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="m-1.5 p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
            >
              <IconSend className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[10px]">Enter</kbd> to send · Powered by LangGraph + Groq
          </p>
        </form>
      </div>
    </div>
  );
}