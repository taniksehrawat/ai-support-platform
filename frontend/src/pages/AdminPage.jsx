// frontend/src/pages/AdminPage.jsx
import { useState, useEffect, useRef } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import {
  IconUpload, IconFile, IconTrash, IconStore, IconCheck,
  IconAlert, IconRefresh, IconChevronRight,
} from "../components/Icons";

function parseApiError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join("; ");
  }
  return err.message || fallback;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors =
    type === "success" ? "bg-emerald-600 text-white" :
    type === "error" ? "bg-red-600 text-white" :
    "bg-slate-800 text-white";
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 text-sm font-medium z-50 animate-slide-up ${colors}`}>
      {type === "success" ? <IconCheck className="w-4 h-4" /> : <IconAlert className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function AdminPage() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingShops, setUploadingShops] = useState(false);
  const [shopImportResult, setShopImportResult] = useState(null);
  const [toast, setToast] = useState(null);
  const rulesInputRef = useRef(null);
  const shopsInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/knowledge");
      setPdfs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({ type: "error", message: parseApiError(err, "Failed to load PDFs") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadRules = async (file) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await API.post("/knowledge/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setToast({ type: "success", message: `${file.name} uploaded` });
      await load();
    } catch (err) {
      setToast({ type: "error", message: parseApiError(err, "Upload failed") });
    } finally {
      setUploading(false);
      if (rulesInputRef.current) rulesInputRef.current.value = null;
    }
  };

  const uploadShopCatalog = async (file) => {
    if (!file) return;
    setUploadingShops(true);
    setShopImportResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await API.post("/admin/shops/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      setShopImportResult(res.data);
      setToast({
        type: "success",
        message: `Imported ${res.data.imported_shops.length} shops`,
      });
    } catch (err) {
      setToast({ type: "error", message: parseApiError(err, "Shop import failed") });
    } finally {
      setUploadingShops(false);
      if (shopsInputRef.current) shopsInputRef.current.value = null;
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this PDF and its indexed data?")) return;
    try {
      await API.delete(`/admin/knowledge/${id}`);
      setToast({ type: "success", message: "PDF deleted" });
      await load();
    } catch (err) {
      setToast({ type: "error", message: parseApiError(err, "Delete failed") });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Manage knowledge base and shop catalog</p>
          </div>
          <button
            onClick={load}
            className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
            title="Refresh"
          >
            <IconRefresh className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Upload cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Rules */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
              <IconFile className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hostel Rules (RAG)</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload policy PDFs. Chunked, embedded, and indexed into Qdrant for retrieval.
            </p>
            <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/30 cursor-pointer hover:shadow-lg transition ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <IconUpload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                ref={rulesInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => uploadRules(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          {/* Shops */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
              <IconStore className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Shop Catalog (SQL)</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload a PDF with shops + menus. LLM extracts and imports into the database.
            </p>
            <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/30 cursor-pointer hover:shadow-lg transition ${uploadingShops ? "opacity-60 pointer-events-none" : ""}`}>
              <IconUpload className="w-4 h-4" />
              {uploadingShops ? "Parsing (10-20s)..." : "Upload Shop PDF"}
              <input
                ref={shopsInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => uploadShopCatalog(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Shop import result */}
        {shopImportResult && (
          <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm mb-8 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <IconCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Imported {shopImportResult.imported_shops.length} new shop{shopImportResult.imported_shops.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-slate-500">
                  DB: {shopImportResult.total_shops_in_db} shops · {shopImportResult.total_items_in_db} items
                </p>
              </div>
            </div>

            {shopImportResult.imported_shops.length > 0 && (
              <div className="space-y-2 mb-3">
                {shopImportResult.imported_shops.map((s) => (
                  <div key={s.shop_id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-bold text-slate-900">{s.shop_name}</p>
                    <p className="font-mono text-slate-600 mt-0.5">
                      {s.owner_email}
                      {s.owner_password && <span className="text-emerald-700"> / {s.owner_password}</span>}
                    </p>
                    <p className="text-slate-500">
                      {s.items_count} items added
                      {!s.owner_password && <span> (existing account)</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {shopImportResult.warnings?.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold mb-1">Warnings:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {shopImportResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* PDF table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900">Indexed Documents</h3>
              <p className="text-xs text-slate-500 mt-0.5">{pdfs.length} file{pdfs.length !== 1 ? "s" : ""} in the knowledge base</p>
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : pdfs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <IconFile className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No PDFs uploaded yet. Upload one to enable rule-based answers.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pdfs.map((p) => (
                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <IconFile className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{p.filename}</p>
                    <p className="text-xs text-slate-500">
                      Uploaded {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                    title="Delete"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}