import React, {
  createContext, useContext,
  useState, useCallback, useEffect,
} from 'react';
import { useDispatch } from 'react-redux';
import api             from '../services/api';
import { setUser, logout as logoutAction } from '../store/authSlice';
import { User }        from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  loading        : boolean;
  loginWithToken : (token: string) => Promise<void>;
  logout         : () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch          = useDispatch();
  const [loading, setLoading] = useState(false);

  // ── loginWithToken ─────────────────────────────────────────────────────────
  // Called by OAuthCallbackPage after receiving ?token= from backend
const loginWithToken = useCallback(async (token: string): Promise<void> => {
  setLoading(true);

  // ── 1. Persist token BEFORE the API call ─────────────────────────────────
  localStorage.setItem('token', token);

  try {
    // ── 2. Pass token explicitly — doesn't rely on interceptor timing ────────
    const { data: user } = await api.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // ── 3. Sync Redux ─────────────────────────────────────────────────────────
    dispatch(setUser({ user, token }));

    // ── 4. Persist user object for refresh restore ────────────────────────────
    localStorage.setItem('user',     JSON.stringify(user));
    localStorage.setItem('userId',   user.id);
    localStorage.setItem('username', user.username);

  } catch (err: any) {
    // ── clean up everything on failure ────────────────────────────────────────
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');

    console.error('[loginWithToken] /auth/me failed:', err?.response?.status, err?.response?.data);
    throw err;
  } finally {
    setLoading(false);
  }
}, [dispatch]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    dispatch(logoutAction());   // authSlice.logout already clears token + user from localStorage
  }, [dispatch]);

  // ── restore session on hard refresh ───────────────────────────────────────
  // authSlice already reads token/user from localStorage in initialState,
  // but we sync Redux if the token is still valid
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (!token || !saved) return;

    // optimistically restore from localStorage immediately (no extra request)
    try {
      const user = JSON.parse(saved) as User;
      dispatch(setUser({ user, token }));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ loading, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;