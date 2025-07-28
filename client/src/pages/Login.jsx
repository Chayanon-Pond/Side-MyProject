import Navbar from "../Components/NavbarSection";
import React, { useState, useEffect, useNavigate } from "react";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = () => {
    console.log("Login submitted:", formData);
    // Handle login submission here
  };

  return (
    <>
      <div>
        <div className="bg-gray-50 min-h-screen">
          <Navbar />
          <div className="container mx-auto py-16 px-4">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
              <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
                Log in
              </h1>

              <div className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 placeholder-gray-400"
                    required
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 placeholder-gray-400"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors duration-200 font-medium"
                  >
                    Log in
                  </button>
                </div>
              </div>

              {/* Sign up Link */}
              <div className="text-center mt-6">
                <p className="text-gray-600 text-sm">
                  Don't have any account?{" "}
                  <a
                    href="#"
                    className="text-gray-800 font-medium hover:underline"
                  >
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
