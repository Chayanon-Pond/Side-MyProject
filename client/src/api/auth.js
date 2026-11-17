import { api } from "../lib/apiClient";

/** Server returns `fullName` on login and `full_name` elsewhere – normalise once. */
export const normalizeUser = (u) => {
  if (!u || typeof u !== "object") return null;
  return {
    ...u,
    full_name: u.full_name ?? u.fullName ?? u.name ?? "",
    profile_image_url: u.profile_image_url ?? u.profile_image ?? null,
  };
};

export const loginRequest = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return { token: data?.token, user: normalizeUser(data?.user) };
};

export const registerRequest = async ({ fullName, username, email, password }) => {
  const { data } = await api.post("/auth/register", { fullName, username, email, password });
  return { token: data?.token, user: normalizeUser(data?.user) };
};

/** Always 200 by contract (no account enumeration). */
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });

export const resetPasswordWithToken = (token, password) =>
  api.post("/auth/reset-password-token", { token, newPassword: password });

/** Logged-in password change. */
export const changePassword = (currentPassword, newPassword) =>
  api.put("/auth/reset-password", { currentPassword, newPassword });
