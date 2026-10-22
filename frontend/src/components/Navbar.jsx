// frontend/src/components/Navbar.jsx
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-indigo-700 text-white p-4 flex justify-between items-center shadow">
      <h1 className="text-lg font-bold">🎓 CU Hostel Help Assistant</h1>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/chat" className="hover:underline">Ask</Link>
        {isAdmin && (
          <>
            <Link to="/admin" className="hover:underline">Manage Rules</Link>
            <Link to="/admin/analytics" className="hover:underline">Analytics</Link>
          </>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}