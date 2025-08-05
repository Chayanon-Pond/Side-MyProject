import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/authentication";
import { NotificationProvider } from "./contexts/notifications";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ArticleDetail from "./pages/ArticleDetail";
import CardDetal from "./Components/CardDetal";
// Admin components
import AdminLayout from "./Components/ui/AdminLayout";
import Dashboard from "./pages/admin/dashboard";
import CreateArticle from "./pages/admin/create-article";
import EditArticle from "./pages/admin/edit-article";
import AdminLogin from "./pages/admin/admin-login";
import CategoryManagement from "./pages/admin/category-management";
import AdminProfile from "./pages/admin/Profile";
import Notification from "./pages/admin/notification";
import AdminResetPassword from "./pages/admin/resetPassword";
// User components
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Notifications from "./pages/Notifications";

import { Toaster } from "sonner";
function App() {
  return (
    <>
      <Router>
        {/* AuthProvider */}
        <AuthProvider>
          <NotificationProvider>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/detail/:id" element={<CardDetal />} />
            {/* Admin Routes with Layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="dashboard/category"
                element={<CategoryManagement />}
              />
              <Route path="dashboard/profile" element={<AdminProfile />} />
              <Route path="dashboard/notification" element={<Notification />} />
              <Route path="create-article" element={<CreateArticle />} />
              <Route path="edit-article/:id" element={<EditArticle />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="notification" element={<Notification />} />
              <Route path="reset-password" element={<AdminResetPassword />} />
            </Route>
            
            {/* Admin Login Route (outside of AdminLayout) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </Router>      {/* Toast notifications */}
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}

export default App;
