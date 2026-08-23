// frontend/src/pages/TicketsPage.jsx
import { useState, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await API.get("/tickets/");
      setTickets(res.data);
    } catch (err) {
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Support Tickets</h2>
          <a
            href="/chat"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Chat
          </a>
        </div>

        {loading && <p className="text-gray-500">Loading tickets...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && tickets.length === 0 && (
          <p className="text-gray-400">No tickets yet. You can create one via the chat.</p>
        )}

        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{ticket.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ticket.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}