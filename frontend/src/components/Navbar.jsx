// frontend/src/components/Navbar.jsx
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-blue-700 text-white p-4 flex justify-between items-center shadow">
      <h1 className="text-xl font-bold">AI Support Platform</h1>
      <div className="flex items-center gap-4">
        <Link to="/chat" className="hover:underline text-sm">
          Chat
        </Link>
        <Link to="/tickets" className="hover:underline text-sm">
          Tickets
        </Link>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}