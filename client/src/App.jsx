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
              <Route path="create-article" element={<CreateArticle />} />
              {/* <Route path="edit-article/:id" element={<EditArticle />} /> */}
            </Route>
          </Routes>
        </AuthProvider>
      </Router>

      {/* Toast notifications */}
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}

export default App;
