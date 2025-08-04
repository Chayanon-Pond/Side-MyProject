import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authentication";
import { useCustomToast } from "../../Components/ui/CustomToast";
import axios from "axios";

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useCustomToast();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email: formData.email,
          password: formData.password,
        }
      );

      // Check if user is admin
      if (response.data.user && response.data.user.role !== "admin") {
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      // Login success
      console.log("=== LOGIN SUCCESS DEBUG ===");
      console.log("Response data:", response.data);
      console.log("Token:", response.data.token);
      console.log("User:", response.data.user);

      login(response.data.token, response.data.user);

      // Check localStorage after login
      setTimeout(() => {
        console.log("LocalStorage token:", localStorage.getItem("token"));
        console.log("LocalStorage user:", localStorage.getItem("user"));
      }, 100);

      toast.success("Login successful! Welcome to admin panel");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      if (error.response?.status === 401) {
        toast.error("Invalid email or password");
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-gray-100 rounded-xl p-8 w-full max-w-md shadow-md">
        <p className="text-sm text-amber-400 mb-1 font-medium">Admin panel</p>
        <h2 className="text-2xl font-bold mb-6">Log in</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm mb-1 text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-black"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-1 text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-black"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-full px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        {/* Demo credentials info */}
        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 font-medium mb-1">
            Demo Admin Credentials:
          </p>
          <p className="text-xs text-amber-600">Email: admin@example.com</p>
          <p className="text-xs text-amber-600">Password: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
