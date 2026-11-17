// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import AdminAnalytics from "./pages/AdminAnalytics";
import ShopDashboard from "./pages/ShopDashboard";
import StudentOrders from "./pages/StudentOrders";
import ProtectedRoute from "./components/ProtectedRoute";

function RoleGate({ children, allow }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user && allow.includes(user.role) ? children : <Navigate to="/chat" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

        <Route path="/orders" element={
          <ProtectedRoute><RoleGate allow={["student"]}><StudentOrders /></RoleGate></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute><RoleGate allow={["admin"]}><AdminPage /></RoleGate></ProtectedRoute>
        } />

        <Route path="/admin/analytics" element={
          <ProtectedRoute><RoleGate allow={["admin"]}><AdminAnalytics /></RoleGate></ProtectedRoute>
        } />

        <Route path="/shop" element={
          <ProtectedRoute><RoleGate allow={["shopkeeper"]}><ShopDashboard /></RoleGate></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}