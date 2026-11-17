import { api } from "../lib/apiClient";
import { normalizeUser } from "./auth";

/** Same limit as the API (users.bio, max 280 characters). Shown on the article author card. */
export const BIO_MAX = 280;

/** GET /profile -> the signed-in user's own profile (includes bio, which the login payload does not). */
export const getProfile = async ({ signal } = {}) => {
  const { data } = await api.get("/profile", { signal });
  return normalizeUser(data);
};

/**
 * PUT /auth/profile (multipart). Fields: full_name, username, email, bio?, profile_image?
 * Returns the normalised user.
 */
export const updateProfile = async ({ full_name, username, email, bio, imageFile }) => {
  const form = new FormData();
  form.append("full_name", full_name ?? "");
  form.append("username", username ?? "");
  form.append("email", email ?? "");
  if (bio !== undefined) form.append("bio", bio ?? "");
  if (imageFile) form.append("profile_image", imageFile);
  const { data } = await api.put("/auth/profile", form);
  return normalizeUser(data?.user);
};
