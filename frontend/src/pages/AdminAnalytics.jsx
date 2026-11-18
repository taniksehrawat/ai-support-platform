// frontend/src/pages/AdminAnalytics.jsx
import { useEffect, useState } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import {
  IconShoppingBag, IconCheck, IconClock, IconFile,
  IconSearch, IconBarChart, IconUser, IconAlert, IconRefresh,
} from "../components/Icons";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Legend,
} from "recharts";

const StatCard = ({ icon, label, value, gradient }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
    <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center text-white mb-3 shadow-md`}>
      {icon}
    </div>
    <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
    <p className="text-xs text-slate-500 mt-1.5 font-medium">{label}</p>
  </div>
);

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [top, setTop] = useState([]);
  const [unanswered, setUnanswered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [s, d, t, u] = await Promise.all([
        API.get("/admin/analytics/summary"),
        API.get("/admin/analytics/daily"),
        API.get("/admin/analytics/top-questions"),
        API.get("/admin/analytics/unanswered"),
      ]);
      setSummary(s.data);
      setDaily(Array.isArray(d.data) ? d.data : []);
      setTop(Array.isArray(t.data) ? t.data : []);
      setUnanswered(Array.isArray(u.data) ? u.data : []);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 space-y-4">
          <div className="h-10 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <IconAlert className="w-5 h-5" /> {err}
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { icon: <IconShoppingBag className="w-5 h-5" />, label: "Total questions", value: summary?.total_questions ?? 0, gradient: "bg-gradient-to-br from-indigo-500 to-purple-600" },
    { icon: <IconCheck className="w-5 h-5" />, label: "Answered", value: summary?.answered_questions ?? 0, gradient: "bg-gradient-to-br from-emerald-500 to-teal-600" },
    { icon: <IconClock className="w-5 h-5" />, label: "Unanswered", value: summary?.unanswered_questions ?? 0, gradient: "bg-gradient-to-br from-amber-500 to-orange-600" },
    { icon: <IconBarChart className="w-5 h-5" />, label: "Answer rate", value: `${summary?.answer_rate ?? 0}%`, gradient: "bg-gradient-to-br from-pink-500 to-rose-600" },
    { icon: <IconUser className="w-5 h-5" />, label: "Unique students", value: summary?.unique_students ?? 0, gradient: "bg-gradient-to-br from-cyan-500 to-blue-600" },
    { icon: <IconFile className="w-5 h-5" />, label: "PDFs indexed", value: summary?.total_pdfs ?? 0, gradient: "bg-gradient-to-br from-violet-500 to-fuchsia-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">Insights from your AI assistant</p>
          </div>
          <button
            onClick={load}
            className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
            title="Refresh"
          >
            <IconRefresh className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        {/* Daily chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <IconBarChart className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Questions per day</h3>
              <p className="text-xs text-slate-500">Last 14 days of activity</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              />
              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: "#4f46e5", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top questions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <IconSearch className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Top questions</h3>
              <p className="text-xs text-slate-500">Most frequently asked</p>
            </div>
          </div>
          {top.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, top.length * 40)}>
              <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  type="category"
                  dataKey="question"
                  width={260}
                  tick={{ fontSize: 11, fill: "#475569" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Unanswered */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <IconAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Content gaps</h3>
              <p className="text-xs text-slate-500">Questions that couldn't be answered</p>
            </div>
          </div>
          {unanswered.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <IconCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-slate-900">No gaps — great!</p>
              <p className="text-xs text-slate-500 mt-0.5">Every question was answered</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unanswered.map((u, i) => (
                <li key={i} className="py-2.5 flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 break-words">{u.question}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {u.asked_at ? new Date(u.asked_at).toLocaleString() : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}