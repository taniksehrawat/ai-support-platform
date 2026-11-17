// frontend/src/pages/ShopDashboard.jsx
import { useState, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";

const STATUS_OPTIONS = ["accepted", "preparing", "ready", "completed", "cancelled"];

export default function ShopDashboard() {
  const [tab, setTab] = useState("orders"); // "orders" | "menu"
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", price: "", description: "" });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [shopRes, menuRes, ordersRes] = await Promise.all([
        API.get("/shops/me"),
        API.get("/shops/me/menu"),
        API.get("/orders/incoming"),
      ]);
      setShop(shopRes.data);
      setMenu(menuRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Auto-refresh orders every 15s (only in Orders tab)
  useEffect(() => {
    if (tab !== "orders") return;
    const id = setInterval(async () => {
      try {
        const res = await API.get("/orders/incoming");
        setOrders(res.data);
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(id);
  }, [tab]);

  const toggleOpen = async () => {
    try {
      const res = await API.patch("/shops/me", { is_open: !shop.is_open });
      setShop(res.data);
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to toggle");
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      await API.post("/shops/me/menu", {
        name: form.name,
        price: parseFloat(form.price),
        description: form.description || null,
        is_available: true,
      });
      setForm({ name: "", price: "", description: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to add item");
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await API.patch(`/shops/me/menu/${item.id}`, { is_available: !item.is_available });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to update");
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await API.delete(`/shops/me/menu/${id}`);
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to delete");
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update order");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6">Loading…</div>
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 text-red-600">No shop assigned to your account. Contact admin.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{shop.name}</h2>
            <p className="text-sm text-slate-500">{shop.description}</p>
          </div>
          <button onClick={toggleOpen}
            className={`px-4 py-2 rounded text-white ${
              shop.is_open ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
            }`}>
            {shop.is_open ? "🟢 Open — click to close" : "🔴 Closed — click to open"}
          </button>
        </div>

        <div className="flex gap-2 border-b">
          <button onClick={() => setTab("orders")}
            className={`px-4 py-2 ${tab === "orders" ? "border-b-2 border-indigo-600 font-semibold" : "text-slate-500"}`}>
            Incoming Orders ({orders.length})
          </button>
          <button onClick={() => setTab("menu")}
            className={`px-4 py-2 ${tab === "menu" ? "border-b-2 border-indigo-600 font-semibold" : "text-slate-500"}`}>
            Menu ({menu.length})
          </button>
        </div>

        {status && <p className="text-sm text-red-600">{status}</p>}

        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-slate-400">No orders yet.</p>}
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Order #{o.id}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-lg font-bold">₹{Number(o.total_amount).toFixed(2)}</span>
                </div>
                <ul className="mt-2 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity} × {i.item_name} @ ₹{Number(i.unit_price).toFixed(2)}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    o.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    o.status === "completed" ? "bg-green-100 text-green-800" :
                    o.status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>{o.status}</span>
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <select value="" onChange={(e) => e.target.value && updateOrderStatus(o.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm">
                      <option value="">Change status…</option>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "menu" && (
          <div className="space-y-4">
            <form onSubmit={addItem} className="bg-white rounded shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
              <input required placeholder="Item name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded px-3 py-2" />
              <input required type="number" step="0.01" min="0.01" placeholder="Price"
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border rounded px-3 py-2" />
              <input placeholder="Description (optional)"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border rounded px-3 py-2 md:col-span-2" />
              <button type="submit"
                className="md:col-span-4 bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700">
                + Add Item
              </button>
            </form>

            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3">Available</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {menu.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-2 px-3">{m.name}</td>
                      <td className="py-2 px-3">₹{Number(m.price).toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => toggleAvailability(m)}
                          className={`px-2 py-1 rounded text-xs ${
                            m.is_available ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                          }`}>
                          {m.is_available ? "Available" : "Unavailable"}
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => deleteItem(m.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}