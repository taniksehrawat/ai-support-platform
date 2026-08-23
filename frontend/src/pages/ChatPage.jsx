// frontend/src/pages/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");

    // Add user message to chat
    const updatedMessages = [...messages, { sender: "user", text: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await API.post("/chat/", { message: userMsg });
      const aiText = res.data.response;
      setMessages([...updatedMessages, { sender: "ai", text: aiText }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { sender: "ai", text: "Error: " + (err.response?.data?.detail || "Something went wrong.") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadStatus(`Uploading ${file.name}...`);
    try {
      await API.post("/knowledge/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅ ${file.name} uploaded successfully.`);
      // Clear the input so user can upload same file again
      e.target.value = null;
    } catch (err) {
      setUploadStatus(`❌ Upload failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-20">
            Start a conversation or upload a PDF to the knowledge base.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-gray-200 text-gray-400 px-4 py-2 rounded-lg">
              AI is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* PDF upload status indicator */}
      {uploadStatus && (
        <div className="px-4 py-2 bg-gray-100 text-sm text-gray-700 border-t">
          {uploadStatus}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSend} className="bg-white border-t p-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-1 border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <label className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded cursor-pointer text-sm font-medium">
          📎 PDF
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
        </label>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}