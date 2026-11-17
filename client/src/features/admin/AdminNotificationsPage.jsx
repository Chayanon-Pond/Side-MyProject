import { useEffect, useState } from "react";
import { AnimatePresence, m as M } from "motion/react";
import { Bell, CheckCircle2, FileText, Heart, Info, MessageCircle, X } from "lucide-react";
import { useNotifications } from "../notifications/NotificationContext";
import { timeAgo } from "../../lib/format";
import { EASE } from "../../lib/motion";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/States";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const TYPE_ICON = {
  comment: { Icon: MessageCircle, tone: "text-data bg-data-soft" },
  like: { Icon: Heart, tone: "text-danger bg-danger/10" },
  article_published: { Icon: CheckCircle2, tone: "text-ok bg-ok/10" },
  system: { Icon: Info, tone: "text-muted bg-surface-2" },
};
const DEFAULT_ICON = { Icon: FileText, tone: "text-muted bg-surface-2" };
const FILTERS = ["all", "unread", "read"];

/** Admin notification list – reads/writes through the shared NotificationContext. */
const AdminNotificationsPage = () => {
  useDocumentTitle("Newsroom · Notifications");
  const { notifications, isLoading, error, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const visible = notifications.filter((n) => (filter === "unread" ? !n.is_read : filter === "read" ? n.is_read : true));
  const hasUnread = notifications.some((n) => !n.is_read);
  const count = (k) => notifications.filter((n) => (k === "unread" ? !n.is_read : k === "read" ? n.is_read : true)).length;

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 md:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Inbox</p>
          <h1 className="font-expanded text-3xl font-extrabold tracking-tight">Notifications</h1>
        </div>
        {hasUnread && (
          <button type="button" onClick={markAllAsRead} className="btn-apex btn-ghost-apex">
            Mark all as read
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter notifications">
        {FILTERS.map((key) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className="chip capitalize">
            {key}
            <span className="font-mono text-[11px] opacity-70">{count(key)}</span>
          </button>
        ))}
      </div>

      <div className="card-apex overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <Spinner label="Loading notifications" />
        ) : error && notifications.length === 0 ? (
          <ErrorState title="Couldn't load notifications" message={error} onRetry={fetchNotifications} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing here" message="You're all caught up." />
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={true}>
              {visible.map((n, i) => {
                const { Icon, tone } = TYPE_ICON[n.type] || DEFAULT_ICON;
                return (
                  <M.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, delay: i * 0.04 } }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                    className={`relative flex items-start gap-4 px-5 py-4 ${!n.is_read ? "bg-surface-2/40" : ""}`}
                  >
                    {!n.is_read && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-papaya" aria-hidden="true" />}
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-semibold">
                          {n.title || n.sender_name}
                          {!n.is_read && <span className="sr-only"> (unread)</span>}
                        </h2>
                        <span className="meta shrink-0 normal-case tracking-normal">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{n.message}</p>
                      {!n.is_read && (
                        <button type="button" onClick={() => markAsRead(n.id)} className="mt-2 text-xs font-medium text-papaya-ink hover:underline">
                          Mark as read
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] text-subtle hover:bg-danger/10 hover:text-danger"
                      aria-label="Delete notification"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </M.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
