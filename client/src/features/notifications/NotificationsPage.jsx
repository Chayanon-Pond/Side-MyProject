import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "./NotificationContext";
import { imgFallback, DEFAULT_AVATAR } from "../../lib/assets";
import { timeAgo } from "../../lib/format";
import { ErrorState, Spinner } from "../../components/ui/States";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const FILTERS = ["all", "unread", "read"];

const NotificationsPage = () => {
  useDocumentTitle("Notifications");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, isLoading, error, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [filter, setFilter] = useState("all");

  // Refresh when the page is opened.
  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  const handleNotificationClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const counts = { all: notifications.length, unread: unreadCount, read: notifications.length - unreadCount };
  const visible = notifications.filter((n) => (filter === "unread" ? !n.is_read : filter === "read" ? n.is_read : true));

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-fg">Please log in to view notifications</h1>
          <Link to="/login" state={{ from: "/notifications" }} className="text-papaya-ink hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-surface rounded-[6px] border border-line">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-fg">Notifications</h1>
              <p className="text-muted mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-4 py-2 bg-papaya text-papaya-contrast rounded-[6px] hover:brightness-110 transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="px-6 py-4 border-b">
            <div className="flex space-x-1" role="group" aria-label="Filter notifications">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors capitalize cursor-pointer ${
                    filter === key ? "bg-papaya/15 text-papaya-ink" : "text-muted hover:text-fg hover:bg-surface-2"
                  }`}
                >
                  {key} ({counts[key]})
                </button>
              ))}
            </div>
          </div>

          {isLoading && notifications.length === 0 ? (
            <Spinner label="Loading notifications" />
          ) : error && notifications.length === 0 ? (
            <ErrorState title="Couldn't load notifications" message={error} onRetry={fetchNotifications} />
          ) : visible.length > 0 ? (
            <ul className="divide-y">
              {visible.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-6 cursor-pointer hover:bg-bg transition-colors ${
                      !n.is_read ? "bg-papaya/5 border-l-4 border-papaya" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-2 flex-shrink-0">
                        {n.sender_avatar ? (
                          <img src={n.sender_avatar} onError={imgFallback(DEFAULT_AVATAR)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-subtle">
                            <User className="w-6 h-6" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-fg">{n.sender_name || n.title}</span>
                          {n.action && <span className="text-muted">{n.action}</span>}
                          {!n.is_read && (
                            <span className="w-2 h-2 bg-papaya rounded-full">
                              <span className="sr-only">Unread</span>
                            </span>
                          )}
                        </div>
                        <p className="text-muted mb-2">{n.message}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-subtle">{timeAgo(n.created_at)}</p>
                          {n.link && <span className="text-sm text-papaya-ink">Click to view →</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-subtle" aria-hidden="true" />
              <h2 className="text-lg font-medium text-fg mb-2">
                {filter === "unread" ? "No unread notifications" : filter === "read" ? "No read notifications" : "No notifications"}
              </h2>
              <p className="text-subtle">
                {filter === "all"
                  ? "You'll see notifications here when you receive them."
                  : filter === "unread"
                    ? "All your notifications have been read."
                    : "You haven't read any notifications yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
