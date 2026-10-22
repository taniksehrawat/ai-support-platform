// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import AdminAnalytics from "./pages/AdminAnalytics";
import ProtectedRoute from "./components/ProtectedRoute";

function AdminOnly({ children }) {
  const role = localStorage.getItem("role");
  return role === "admin" ? children : <Navigate to="/chat" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminOnly><AdminPage /></AdminOnly></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><AdminOnly><AdminAnalytics /></AdminOnly></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}