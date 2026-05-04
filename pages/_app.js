import '../styles/globals.css';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  );
}

export default function App({ Component, pageProps }) {
  const [auth, setAuth] = useState(null); // { token, role, user }
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('gs_auth');
    if (saved) {
      try { setAuth(JSON.parse(saved)); } catch {}
    }
  }, []);

  const login = useCallback((data) => {
    setAuth(data);
    localStorage.setItem('gs_auth', JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    localStorage.removeItem('gs_auth');
  }, []);

  const toast = useCallback((msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }, [auth]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, toast, apiFetch }}>
      <Component {...pageProps} />
      <ToastContainer toasts={toasts} />
    </AuthContext.Provider>
  );
}
