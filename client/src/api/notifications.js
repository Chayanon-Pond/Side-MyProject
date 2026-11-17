import { api } from "../lib/apiClient";

export const listNotifications = async ({ limit = 50, offset = 0 } = {}, { signal } = {}) => {
  const { data } = await api.get("/notifications", { params: { limit, offset }, signal });
  return {
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
    unreadCount: Number(data?.unreadCount) || 0,
  };
};

export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.put("/notifications/mark-all-read");

export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
