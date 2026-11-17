import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "./NotificationContext";
import Avatar from "../../components/ui/Avatar";
import { timeAgo } from "../../lib/format";
import { EASE } from "../../lib/motion";

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleNotificationClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    setIsOpen(false);
    if (n.link) navigate(n.link);
  };

  const recent = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[2px] hover:bg-current/10"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-papaya px-1 font-mono text-[10px] font-semibold text-papaya-contrast"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[6px] border border-line bg-surface text-fg shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="text-xs text-papaya-ink hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto" data-lenis-prevent>
              {recent.length > 0 ? (
                recent.map((n) => (
                  <li key={n.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <Avatar src={n.sender_avatar} name={n.sender_name || n.title} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">
                          <span className="font-semibold">{n.sender_name || n.title}</span>{" "}
                          {n.action && <span className="text-muted">{n.action}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">{n.message}</span>
                        <span className="meta mt-1 block normal-case tracking-normal">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-papaya">
                          <span className="sr-only">Unread</span>
                        </span>
                      )}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-4 py-10 text-center text-sm text-muted">
                  <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
                  You&apos;re all caught up.
                </li>
              )}
            </ul>
            {recent.length > 0 && (
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block border-t border-line px-4 py-3 text-center text-sm font-medium hover:bg-surface-2"
              >
                View all
              </Link>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
