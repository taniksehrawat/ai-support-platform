// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconSparkles, IconShield, IconCoffee, IconChevronRight } from "../components/Icons";

function parseApiError(err, fallback = "Login failed") {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join("; ");
  }
  if (err.message) return err.message;
  return fallback;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      if (role === "shopkeeper") navigate("/shop");
      else if (role === "admin") navigate("/admin");
      else navigate("/chat");
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left: branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <IconSparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">CU Hostel Assistant</p>
              <p className="text-xs text-white/70">Agentic AI · Powered by LangGraph</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold leading-tight mb-3">
                Your AI companion<br />
                for campus life
              </h1>
              <p className="text-white/80 text-lg leading-relaxed">
                Answers hostel rules, orders food, tracks deliveries — all in one chat.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: <IconSparkles className="w-5 h-5" />, title: "Ask anything", desc: "Hostel rules, timings, fees — cited from official PDFs" },
                { icon: <IconCoffee className="w-5 h-5" />, title: "Order food", desc: "6 shops, 38 items — order from your chat window" },
                { icon: <IconShield className="w-5 h-5" />, title: "Role-aware", desc: "Student, shopkeeper, and admin — each with their own view" },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20">
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-xs text-white/70">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} Chandigarh University · Agentic AI Customer Support System
          </p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <IconSparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900">CU Hostel Assistant</span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to continue to your dashboard</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-slide-down">
              {String(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="text"
                placeholder="you@campus.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in <IconChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Create one
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-3">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button type="button" onClick={() => { setEmail("sharma@campus.local"); setPassword("Cafe@123"); }} className="p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 text-left transition">
                <p className="font-semibold">Shopkeeper</p>
                <p className="text-slate-500 truncate">sharma@campus.local</p>
              </button>
              <button type="button" onClick={() => { setEmail("admin@cu.ac.in"); setPassword("Admin@123"); }} className="p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 text-left transition">
                <p className="font-semibold">Admin</p>
                <p className="text-slate-500 truncate">admin@cu.ac.in</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}