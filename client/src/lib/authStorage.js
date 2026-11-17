// Single place that touches auth data in localStorage.
// Every read is defensive: corrupted JSON or blocked storage must never crash the app.

const TOKEN_KEY = "token";
const USER_KEY = "user";

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or blocked – auth will just not persist across reloads
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const getStoredToken = () => safeGet(TOKEN_KEY);

export const getStoredUser = () => {
  const raw = safeGet(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    safeRemove(USER_KEY);
    return null;
  }
};

export const storeAuth = (token, user) => {
  if (token) safeSet(TOKEN_KEY, token);
  if (user) safeSet(USER_KEY, JSON.stringify(user));
};

export const storeUser = (user) => {
  if (user) safeSet(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = () => {
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
};

/** Decode a JWT payload without verifying it (verification is the server's job). */
export const decodeJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

/** True when the token is missing, malformed, or its `exp` is in the past. */
export const isTokenExpired = (token, skewSeconds = 10) => {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== "number") return false; // no exp claim – let the server decide
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
};
