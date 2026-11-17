import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import { setUnauthorizedHandler, getErrorMessage } from "../../lib/apiClient";
import {
  clearStoredAuth,
  decodeJwt,
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  storeAuth,
  storeUser,
} from "../../lib/authStorage";
import { loginRequest, normalizeUser, registerRequest } from "../../api/auth";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider by design
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/** Read persisted auth once at boot; drop it if the JWT is expired or the user blob is corrupt. */
const readInitialAuth = () => {
  const token = getStoredToken();
  const user = normalizeUser(getStoredUser());
  if (!token || !user || isTokenExpired(token)) {
    if (token || user) clearStoredAuth();
    return { token: null, user: null };
  }
  return { token, user };
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [{ token, user }, setAuth] = useState(readInitialAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth({ token: null, user: null });
    setError(null);
  }, []);

  // 401 from any API call -> clear session, tell the user, send them to the right login page.
  const isAdminArea = location.pathname.startsWith("/admin");
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.error("Session expired", { description: "Please log in again." });
      navigate(isAdminArea ? "/admin/login" : "/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, navigate, isAdminArea]);

  // Expire the session client-side exactly when the JWT runs out (timer cleared on change/unmount).
  useEffect(() => {
    if (!token) return undefined;
    if (isTokenExpired(token, 0)) {
      logout();
      return undefined;
    }
    const payloadExp = decodeJwt(token)?.exp;
    if (typeof payloadExp !== "number") return undefined;
    const ms = Math.min(payloadExp * 1000 - Date.now(), 2 ** 31 - 1);
    const id = setTimeout(() => {
      logout();
      toast.error("Session expired", { description: "Please log in again." });
    }, Math.max(ms, 0));
    return () => clearTimeout(id);
  }, [token, logout]);

  /**
   * Log in with email/password.
   * @param {{requireAdmin?: boolean}} opts – when true, non-admin accounts are rejected and NOT persisted.
   */
  const login = useCallback(async (email, password, { requireAdmin = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken, user: newUser } = await loginRequest(email, password);
      if (!newToken || !newUser) throw new Error("Unexpected login response");
      if (requireAdmin && newUser.role !== "admin") {
        const msg = "Access denied. Admin privileges required.";
        setError(msg);
        return { success: false, error: msg };
      }
      storeAuth(newToken, newUser);
      setAuth({ token: newToken, user: newUser });
      return { success: true, user: newUser };
    } catch (err) {
      const msg =
        err?.status === 401
          ? "Invalid email or password"
          : err?.status === 429
            ? "Too many attempts, try again later"
            : getErrorMessage(err, "Login failed");
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      await registerRequest(payload);
      return { success: true };
    } catch (err) {
      const msg = err?.status === 429 ? "Too many attempts, try again later" : getErrorMessage(err, "Registration failed");
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((nextUser) => {
    const normalized = normalizeUser(nextUser);
    if (!normalized) return;
    storeUser(normalized);
    setAuth((prev) => ({ ...prev, user: normalized }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      isAdmin: user?.role === "admin",
      login,
      logout,
      register,
      updateUser,
      clearError,
    }),
    [user, token, loading, error, login, logout, register, updateUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
