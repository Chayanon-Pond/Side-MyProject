import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../contexts/authentication";

const AdminLayout = () => {
  const { user, token } = useAuth();

  // Check if user is authenticated
  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Page Content */}
        <main className="h-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
