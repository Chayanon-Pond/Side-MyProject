import axios from "axios";
import { toast } from "./toast";
import { getStoredToken } from "./authStorage";

/**
 * The ONE axios instance for the whole app.
 *
 * - DEV: always '/api' (Vite proxies it to the local backend, see vite.config.js).
 * - PROD: `${VITE_API_URL}/api`. If VITE_API_URL is missing we log a clear error,
 *   show a toast, and fall back to same-origin '/api' so a same-origin deploy still works.
 */
const rawEnvUrl = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

/** Origin of the API server ('' = same origin). Used for building /uploads URLs. */
export const API_ORIGIN = import.meta.env.DEV ? "" : rawEnvUrl;

const resolveBaseUrl = () => {
  if (import.meta.env.DEV) return "/api";
  if (!rawEnvUrl) {
    const msg =
      "[apiClient] VITE_API_URL is not set for this production build. " +
      "Falling back to same-origin '/api'. Set VITE_API_URL in the deploy environment.";
    console.error(msg);
    // Defer so the <Toaster/> is mounted before we fire the toast.
    setTimeout(() => {
      toast.error("API is not configured", {
        description: "VITE_API_URL is missing in this build. Data may fail to load.",
        duration: 10000,
      });
    }, 0);
    return "/api";
  }
  return `${rawEnvUrl}/api`;
};

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 20000,
});

// ---- request: attach bearer token -------------------------------------------
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 401 handling hook (registered by AuthProvider) --------------------------
let unauthorizedHandler = null;
let handlingUnauthorized = false;

/** AuthProvider registers a callback that clears auth + redirects. */
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

const AUTH_ENDPOINTS_WITHOUT_SESSION = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password-token",
];

const isSessionlessAuthCall = (url = "") =>
  AUTH_ENDPOINTS_WITHOUT_SESSION.some((p) => url.startsWith(p));

/** Error carrying the server's `{ error, code }` contract. */
export class ApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

// ---- response: reject HTML, normalise errors, handle 401 ---------------------
api.interceptors.response.use(
  (response) => {
    const type = String(response.headers?.["content-type"] || "");
    // Reject SPA fallbacks / proxies returning HTML for an API route.
    if (type.includes("text/html")) {
      return Promise.reject(
        new ApiError("Unexpected response from server (HTML instead of JSON).", {
          status: response.status,
          code: "NON_JSON_RESPONSE",
        })
      );
    }
    return response;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const status = error.response?.status;
    const data = error.response?.data;
    const type = String(error.response?.headers?.["content-type"] || "");
    const url = error.config?.url || "";

    let message;
    if (data && typeof data === "object" && (data.error || data.message)) {
      message = data.error || data.message;
    } else if (type.includes("text/html")) {
      message = "Unexpected response from server.";
    } else if (!error.response) {
      message = "Cannot reach the server. Please check your connection.";
    } else {
      message = `Request failed (${status}).`;
    }

    const sentToken = Boolean(error.config?.headers?.Authorization);
    if (status === 401 && sentToken && !isSessionlessAuthCall(url) && unauthorizedHandler) {
      if (!handlingUnauthorized) {
        handlingUnauthorized = true;
        try {
          unauthorizedHandler();
        } finally {
          setTimeout(() => {
            handlingUnauthorized = false;
          }, 1000);
        }
      }
    }

    return Promise.reject(
      new ApiError(message, { status, code: data?.code, cause: error })
    );
  }
);

/** True for aborted requests (AbortController / unmount). */
export const isAbortError = (err) =>
  axios.isCancel(err) || err?.name === "CanceledError" || err?.name === "AbortError";

/** Human-readable message for any thrown error. */
export const getErrorMessage = (err, fallback = "Something went wrong") =>
  (err && err.message) || fallback;
