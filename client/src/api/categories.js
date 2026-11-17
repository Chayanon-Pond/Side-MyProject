import { api } from "../lib/apiClient";

/** GET /categories -> array */
export const listCategories = async ({ signal } = {}) => {
  const { data } = await api.get("/categories", { signal });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data; // tolerate legacy wrapper
  return [];
};

export const createCategory = async (payload) => {
  const { data } = await api.post("/categories", payload);
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await api.put(`/categories/${id}`, payload);
  return data;
};

/** 409 when the category is still used by articles. */
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
