// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import API from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) setUser({ token, role });
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { access_token, role } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("role", role);
    setUser({ token: access_token, role });
  };

  const signup = async (email, username, password) => {
    const res = await API.post("/auth/signup", { email, username, password });
    const { access_token, role } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("role", role);
    setUser({ token: access_token, role });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);