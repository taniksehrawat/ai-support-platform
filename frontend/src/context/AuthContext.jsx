// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import API from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if token exists and validate it
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // In a real app you'd validate token with /auth/me endpoint.
      // For simplicity, assume token is valid and just set user flag.
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    setUser({ token: access_token });
    return res.data;
  };

  const signup = async (email, username, password) => {
    const res = await API.post("/auth/signup", { email, username, password });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    setUser({ token: access_token });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);