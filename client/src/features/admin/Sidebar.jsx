import { m as M } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "../../lib/toast";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../notifications/NotificationContext";
import Wordmark, { Monogram } from "../../components/brand/Wordmark";
import { EASE } from "../../lib/motion";
import { ADMIN_NAV } from "./adminNav";



/**
 * Admin navigation. `collapsed` = icon rail (desktop only). `layoutKey` keeps the gliding
 * indicator's layoutId unique between the desktop rail and the mobile drawer.
 */
export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, layoutKey = "rail" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/admin/login");
  };

  const row = `relative flex h-10 items-center gap-3 rounded-[2px] text-sm transition-colors duration-150 ${
    collapsed ? "justify-center px-0" : "px-3"
  }`;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 shrink-0 items-center border-b border-line ${collapsed ? "justify-center" : "justify-between px-4"}`}>
        <Link to="/admin" aria-label="APEX newsroom — dashboard" onClick={onNavigate} className="flex items-center gap-2">
          {collapsed ? (
            <Monogram className="h-7 w-7 text-fg" />
          ) : (
            <>
              <Wordmark className="h-[18px] w-auto text-fg" />
              <span className="meta mt-0.5">Newsroom</span>
            </>
          )}
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const count = item.badge ? unreadCount : 0;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`${row} ${active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg"}`}
                >
                  {active && (
                    <M.span
                      layoutId={`admin-nav-${layoutKey}`}
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-papaya"
                      transition={{ duration: 0.3, ease: EASE }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {count > 0 && (
                    <span
                      className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-papaya px-1 font-mono text-[10px] font-semibold text-papaya-contrast ${
                        collapsed ? "absolute right-1.5 top-1" : "ml-auto"
                      }`}
                    >
                      {count > 9 ? "9+" : count}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-line px-2 py-3">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`${row} w-full text-muted hover:bg-surface-2/60 hover:text-fg`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : undefined}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`${row} w-full text-muted hover:bg-surface-2/60 hover:text-fg`}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
