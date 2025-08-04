import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authentication";
import { useCustomToast } from "./CustomToast";
import {
  TbLogout,
  TbArticle,
  TbCategory,
  TbUser,
  TbBell,
  TbRefresh,
} from "react-icons/tb";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { logout } = useAuth();
  const toast = useCustomToast();

  const sidebarItems = [
    {
      id: "article-management",
      name: "Article management",
      path: "/admin/dashboard",
      icon: TbArticle,
    },
    {
      id: "category-management",
      name: "Category management",
      path: "/admin/dashboard/category",
      icon: TbCategory,
    },
    {
      id: "profile",
      name: "Profile",
      path: "/admin/dashboard/profile",
      icon: TbUser,
    },
    {
      id: "notification",
      name: "Notification",
      path: "/admin/dashboard/notification",
      icon: TbBell,
    },
    {
      id: "reset-password",
      name: "Reset password",
      path: "/admin/reset-password",
      icon: TbRefresh,
    },
  ];

  const handleLogout = async () => {
    const loadingToast = toast.loading("Logging out...");

    try {
      logout();

      toast.dismiss(loadingToast);
      toast.success(
        "Logout successful!",
        "You have been logged out successfully"
      );
      navigate("/admin/login");
    } catch (error) {
      console.error("ไม่สามารถออกจากระบบได้:", error);
      toast.dismiss(loadingToast);
      toast.error(
        "Logout failed",
        "There was an error logging out. Please try again."
      );
    }
  };

  return (
    <div className="bg-white w-[240px] min-h-screen shadow-md flex flex-col">
      {/* Logo Section */}
      <div className="p-6">
        <Link to="/" className="block">
          <h1 className="text-2xl font-bold text-gray-800">Porsche</h1>
        </Link>
        <p className="text-sm text-orange-500 mt-1">Admin panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              to={item.path}
              key={item.id}
              className={`flex items-center px-6 py-3 transition-colors duration-150 ease-in-out
                ${
                  isActive
                    ? "bg-gray-100 border-l-4 border-orange-500 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }
              `}
            >
              <item.icon
                className={`w-5 h-5 mr-3 ${
                  isActive ? "text-gray-900" : "text-gray-600"
                }`}
              />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 space-y-4 border-t border-gray-200">
        {/* Website Link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="text-sm">Porsche. website</span>
        </a>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center w-full text-gray-700 hover:text-gray-900 transition-colors"
        >
          <TbLogout className="w-5 h-5 mr-3" />
          <span className="text-sm cursor-pointer">Log out</span>
        </button>
      </div>
    </div>
  );
}
