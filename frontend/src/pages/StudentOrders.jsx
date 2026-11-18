// frontend/src/pages/StudentOrders.jsx
import { useState, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import {
  IconShoppingBag, IconCheck, IconClock, IconX,
  IconAlert, IconRefresh, IconStore,
} from "../components/Icons";

const STATUS_META = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-800 border-amber-200",   step: 0 },
  accepted:  { label: "Accepted",  color: "bg-blue-100 text-blue-800 border-blue-200",     step: 1 },
  preparing: { label: "Preparing", color: "bg-indigo-100 text-indigo-800 border-indigo-200", step: 2 },
  ready:     { label: "Ready",     color: "bg-purple-100 text-purple-800 border-purple-200", step: 3 },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-200", step: 4 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200",        step: -1 },
};

const STEPS = ["Pending", "Accepted", "Preparing", "Ready", "Completed"];

function Timeline({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600 mt-3">
        <IconX className="w-4 h-4" /> Order was cancelled
      </div>
    );
  }
  const currentStep = STATUS_META[status]?.step ?? 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-2 left-0 right-0 h-0.5 bg-slate-200" />
        <div
          className="absolute top-2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((label, i) => (
          <div key={label} className="relative flex flex-col items-center">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                i <= currentStep
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-white border-slate-300"
              }`}
            >
              {i <= currentStep && <IconCheck className="w-2.5 h-2.5 text-white" />}
            </div>
            <p
              className={`text-[10px] mt-1.5 font-medium ${
                i <= currentStep ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/orders/");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await API.patch(`/orders/${id}/status`, { status: "cancelled" });
      await load();
    } catch (err) {
      window.alert(err.response?.data?.detail || "Failed to cancel");
    }
  };

  // Stats
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)).length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">My Orders</h1>
            <p className="text-slate-500 text-sm mt-1">Track your food orders in real time</p>
          </div>
          <button
            onClick={load}
            className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
            title="Refresh"
          >
            <IconRefresh className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <IconShoppingBag className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Total</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <IconClock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Active</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <IconStore className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Spent</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">₹{totalSpent.toFixed(0)}</p>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <IconAlert className="w-5 h-5" /> {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <IconShoppingBag className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No orders yet</h3>
            <p className="text-sm text-slate-500 mb-4">Ask the assistant to order some food</p>
            <a href="/chat" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Go to chat
            </a>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((o) => {
              const meta = STATUS_META[o.status] || STATUS_META.pending;
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <div key={o.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition animate-slide-up">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-slate-900">Order #{o.id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>

                    <ul className="space-y-1.5 mb-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            <span className="font-medium">{item.quantity}×</span> {item.item_name}
                          </span>
                          <span className="text-slate-500">
                            ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Timeline status={o.status} />

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        {o.status === "completed" && <span className="text-emerald-600 font-medium">✓ Delivered</span>}
                        {o.status === "cancelled" && <span className="text-red-600 font-medium">✗ Cancelled</span>}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-900">
                          ₹{Number(o.total_amount || 0).toFixed(2)}
                        </span>
                        {o.status === "pending" && (
                          <button
                            onClick={() => cancel(o.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}