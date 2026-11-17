import { Bell, FileText, FolderTree, KeyRound, LayoutDashboard, PenSquare, User } from "lucide-react";

/** Admin navigation model (shared by the sidebar and the top-bar title). */
export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/admin" || p === "/admin/dashboard" },
  { to: "/admin/articles", label: "Articles", icon: FileText, match: (p) => p.startsWith("/admin/articles") || p.startsWith("/admin/edit-article") },
  { to: "/admin/create-article", label: "New article", icon: PenSquare, match: (p) => p.startsWith("/admin/create-article") },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, match: (p) => p.startsWith("/admin/categories") },
  { to: "/admin/notification", label: "Notifications", icon: Bell, match: (p) => p.startsWith("/admin/notification"), badge: true },
  { to: "/admin/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/admin/profile") },
  { to: "/admin/reset-password", label: "Change password", icon: KeyRound, match: (p) => p.startsWith("/admin/reset-password") },
];
