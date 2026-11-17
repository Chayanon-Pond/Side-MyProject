import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../../lib/toast";
import { useAuth } from "../auth/AuthContext";
import { avatarUrl } from "../../lib/assets";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";
import {
  deleteNotification as apiDelete,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import { notificationLink } from "./links";

const NotificationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider by design
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
};

const normalize = (n) => ({
  ...n,
  sender_avatar: n.sender_avatar ? avatarUrl(n.sender_avatar) : null,
  link: notificationLink(n),
});

/** Single source of truth for notification state (used by navbar, /notifications and admin). */
export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listNotifications({ limit: 50 }, { signal: controller.signal });
      setNotifications(data.notifications.map(normalize));
      setUnreadCount(data.unreadCount);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(getErrorMessage(err, "Failed to load notifications"));
    } finally {
      if (controllerRef.current === controller) setIsLoading(false);
    }
  }, [token]);

  // Load on login, reset on logout, abort on unmount/token change.
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return undefined;
    }
    fetchNotifications();
    return () => controllerRef.current?.abort();
  }, [token, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to mark notification as read"));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to mark all as read"));
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await apiDelete(id);
      const target = notificationsRef.current.find((n) => n.id === id);
      if (target && !target.is_read) setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete notification"));
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    }),
    [notifications, unreadCount, isLoading, error, fetchNotifications, markAsRead, markAllAsRead, deleteNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
