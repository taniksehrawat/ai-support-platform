// frontend/src/components/Navbar.jsx
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconSparkles, IconShoppingBag, IconStore, IconBarChart,
  IconFile, IconLogout, IconMenu, IconX, IconUser,
} from "./Icons";

const NavLink = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-white/20 text-white"
        : "text-white/75 hover:text-white hover:bg-white/10"
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isShopkeeper = user?.role === "shopkeeper";
  const isStudent = user?.role === "student";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    { to: "/chat", icon: <IconSparkles className="w-4 h-4" />, label: "Ask", show: true },
    { to: "/orders", icon: <IconShoppingBag className="w-4 h-4" />, label: "My Orders", show: isStudent },
    { to: "/shop", icon: <IconStore className="w-4 h-4" />, label: "My Shop", show: isShopkeeper },
    { to: "/admin", icon: <IconFile className="w-4 h-4" />, label: "Manage", show: isAdmin },
    { to: "/admin/analytics", icon: <IconBarChart className="w-4 h-4" />, label: "Analytics", show: isAdmin },
  ].filter((l) => l.show);

  const roleLabel =
    user?.role === "admin" ? "Admin" :
    user?.role === "shopkeeper" ? "Shopkeeper" : "Student";

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/chat" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-105 transition">
              <IconSparkles className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-tight">CU Hostel Assistant</p>
              <p className="text-xs text-white/70 leading-tight">Agentic AI</p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                icon={l.icon}
                label={l.label}
                active={location.pathname === l.to}
              />
            ))}
          </div>

          {/* User section */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur">
              <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center">
                <IconUser className="w-4 h-4" />
              </div>
              <div className="text-xs leading-tight">
                <p className="font-semibold">{roleLabel}</p>
                <p className="text-white/70 truncate max-w-[140px]">{user?.email || ""}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors"
            >
              <IconLogout className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-slide-down">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                icon={l.icon}
                label={l.label}
                active={location.pathname === l.to}
              />
            ))}
            <div className="pt-2 mt-2 border-t border-white/20">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs">
                  <p className="font-semibold">{roleLabel}</p>
                  <p className="text-white/70 truncate max-w-[200px]">{user?.email || ""}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500/90 hover:bg-red-500 text-xs font-semibold"
                >
                  <IconLogout className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}