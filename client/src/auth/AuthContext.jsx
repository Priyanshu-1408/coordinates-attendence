import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'office-attendance-token';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    apiRequest('/auth/me').then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      return result.user;
    },
    async register(details) {
      const result = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(details) });
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      return result.user;
    },
    getAttendanceToday() {
      return apiRequest('/attendance/today');
    },
    punchIn(location) {
      return apiRequest('/attendance/punch-in', { method: 'POST', body: JSON.stringify(location) });
    },
    logout() {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
