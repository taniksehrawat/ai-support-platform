// frontend/src/pages/StudentOrders.jsx
import { useState, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";

export default function StudentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await API.get("/orders/");
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm("Cancel this order?")) return;
    try {
      await API.patch(`/orders/${id}/status`, { status: "cancelled" });
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel");
    }
  };

  const badge = (status) => {
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return `px-2 py-1 text-xs rounded ${map[status] || "bg-gray-100"}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">My Orders</h2>
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && orders.length === 0 && (
          <p className="text-slate-400">No orders yet. Ask the assistant to order food.</p>
        )}

        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <span className={badge(o.status)}>{o.status}</span>
              </div>
              <ul className="mt-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.id}>{i.quantity} × {i.item_name} @ ₹{Number(i.unit_price).toFixed(2)}</li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between items-center">
                <span className="font-bold">₹{Number(o.total_amount).toFixed(2)}</span>
                {o.status === "pending" && (
                  <button onClick={() => cancel(o.id)} className="text-red-600 text-sm hover:underline">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}