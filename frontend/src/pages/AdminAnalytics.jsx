// frontend/src/pages/AdminAnalytics.jsx
import { useEffect, useState } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [top, setTop] = useState([]);
  const [unanswered, setUnanswered] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, d, t, u] = await Promise.all([
          API.get("/admin/analytics/summary"),
          API.get("/admin/analytics/daily"),
          API.get("/admin/analytics/top-questions"),
          API.get("/admin/analytics/unanswered"),
        ]);
        setSummary(s.data);
        setDaily(d.data);
        setTop(t.data);
        setUnanswered(u.data);
      } catch (e) {
        setErr(e.response?.data?.detail || "Failed to load analytics");
      }
    })();
  }, []);

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!summary) return <div className="p-6">Loading analytics...</div>;

  const cards = [
    ["Total Questions", summary.total_questions],
    ["Answered", summary.answered_questions],
    ["Unanswered", summary.unanswered_questions],
    ["Answer Rate", `${summary.answer_rate}%`],
    ["Unique Students", summary.unique_students],
    ["PDFs Indexed", summary.total_pdfs],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <h2 className="text-2xl font-bold">Analytics</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map(([label, value]) => (
            <div key={label} className="bg-white rounded shadow p-4">
              <p className="text-slate-500 text-sm">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Questions per Day</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Top Questions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top} layout="vertical" margin={{ left: 120 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="question" width={220} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Unanswered Questions (content gaps)</h3>
          {unanswered.length === 0 ? (
            <p className="text-slate-400 text-sm">None — great!</p>
          ) : (
            <ul className="text-sm divide-y">
              {unanswered.map((u, i) => (
                <li key={i} className="py-2">
                  <span className="text-slate-700">{u.question}</span>
                  <span className="text-slate-400 text-xs ml-2">
                    {new Date(u.asked_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}