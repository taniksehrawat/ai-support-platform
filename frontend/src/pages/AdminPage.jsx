// frontend/src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import API from "../api";
import Navbar from "../components/Navbar";

export default function AdminPage() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/knowledge");
      setPdfs(res.data);
    } catch {
      setStatus("Failed to load PDFs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setStatus(`Uploading ${file.name}...`);
    try {
      await API.post("/knowledge/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus(`✅ ${file.name} uploaded.`);
      e.target.value = null;
      await load();
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || err.message}`);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this PDF and its indexed data?")) return;
    try {
      await API.delete(`/admin/knowledge/${id}`);
      await load();
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Manage Hostel Rules</h2>
        <p className="text-slate-600 mb-6">
          Upload PDFs of official hostel rules, timings, policies. All students will
          get answers from these documents.
        </p>

        <label className="inline-block bg-indigo-600 text-white px-4 py-2 rounded cursor-pointer mb-4">
          + Upload PDF
          <input type="file" accept=".pdf" onChange={upload} className="hidden" />
        </label>

        {status && <p className="text-sm text-slate-700 mb-3">{status}</p>}

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : pdfs.length === 0 ? (
          <p className="text-slate-400">No PDFs uploaded yet.</p>
        ) : (
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Filename</th>
                  <th className="py-2 px-3">Uploaded</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pdfs.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 px-3">{p.id}</td>
                    <td className="py-2 px-3">{p.filename}</td>
                    <td className="py-2 px-3">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => remove(p.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}