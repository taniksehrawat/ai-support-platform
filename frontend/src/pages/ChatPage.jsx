// frontend/src/pages/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const SAMPLE_QUESTIONS = [
  "What are the mess timings?",
  "Can I keep an electric kettle in my room?",
  "What is the process to apply for leave?",
  "How do I contact the hostel warden?",
];

export default function ChatPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");
    const updated = [...messages, { sender: "user", text: msg }];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await API.post("/chat/", { message: msg });
      setMessages([...updated, { sender: "ai", text: res.data.response }]);
    } catch (err) {
      setMessages([...updated, {
        sender: "ai",
        text: "Error: " + (err.response?.data?.detail || "Something went wrong."),
      }]);
    } finally {
      setLoading(false);
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
      setUploadStatus(`✅ ${file.name} uploaded.`);
      e.target.value = null;
    } catch (err) {
      setUploadStatus(`❌ ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center mt-16">
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Ask anything about CU hostel life
            </h2>
            <p className="text-slate-500 mb-6">
              Answers come from official hostel rules uploaded by the admin.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="bg-white border border-slate-300 px-3 py-2 rounded-full text-sm hover:bg-indigo-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex mb-4 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
              m.sender === "user"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-900"
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border px-4 py-2 rounded-lg text-slate-400">
              Assistant is typing...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {uploadStatus && (
        <div className="px-4 py-2 text-sm bg-slate-100 border-t">{uploadStatus}</div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="bg-white border-t p-4 flex items-center gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about hostel rules, timings, leave..."
          className="flex-1 border rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          disabled={loading}
        />
        {isAdmin && (
          <label className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded cursor-pointer text-sm">
            📎 PDF
            <input type="file" accept=".pdf" onChange={upload} className="hidden" />
          </label>
        )}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}