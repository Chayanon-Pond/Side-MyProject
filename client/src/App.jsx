import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/authentication";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
// Admin components
import AdminLayout from "./Components/ui/AdminLayout";
import Dashboard from "./pages/admin/dashboard";
import CreateArticle from "./pages/admin/create-article";
import EditArticle from "./pages/admin/edit-article";
import AdminLogin from "./pages/admin/admin-login";
import CategoryManagement from "./pages/admin/category-management";
import Profile from "./pages/admin/Profile";
import Notification from "./pages/admin/notification";

import { Toaster } from "sonner";
function App() {
  return (
    <>
      <Router>
        {/* AuthProvider */}
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            {/* Admin Routes with Layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="dashboard/category"
                element={<CategoryManagement />}
              />
              <Route path="dashboard/profile" element={<Profile />} />
              <Route path="dashboard/notification" element={<Notification />} />
              <Route path="create-article" element={<CreateArticle />} />
              <Route path="edit-article/:id" element={<EditArticle />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notification" element={<Notification />} />
            </Route>
            
            {/* Admin Login Route (outside of AdminLayout) */}
            <Route path="/admin/login" element={<AdminLogin />} />
          </Routes>
        </AuthProvider>
      </Router>

      {/* Toast notifications */}
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}

export default App;
