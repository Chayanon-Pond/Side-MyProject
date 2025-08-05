import React, { useState, useContext } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AuthenContext = React.createContext();

export const useAuth = () => {
  const context = useContext(AuthenContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    user: JSON.parse(localStorage.getItem("user")) || null,
    token: localStorage.getItem("token") || null,
  });

  // Register function
  const register = async (data) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        data
      );

      const { user, token } = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      setState((prev) => ({
        ...prev,
        loading: false,
        user: user,
        token: token,
      }));

      return { success: true, message: "Registration successful!" };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Registration failed";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  // Login function - รองรับการเรียกใช้ทั้งสองแบบ
  const login = async (emailOrToken, passwordOrUser) => {
    // ถ้าเป็นการเรียกใช้แบบใหม่ (token, user)
    if (
      typeof emailOrToken === "string" &&
      typeof passwordOrUser === "object" &&
      passwordOrUser.hasOwnProperty("id")
    ) {
      const token = emailOrToken;
      const user = passwordOrUser;

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      setState((prev) => ({
        ...prev,
        loading: false,
        user: user,
        token: token,
      }));

      return { success: true, message: "Login successful!" };
    }

    // การเรียกใช้แบบเดิม (email, password)
    const email = emailOrToken;
    const password = passwordOrUser;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );

      const { user, token } = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      setState((prev) => ({
        ...prev,
        loading: false,
        user: user,
        token: token,
      }));

      return { success: true, message: "Login successful!" };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Login failed";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setState({
      loading: false,
      error: null,
      user: null,
      token: null,
    });
  };

  // Update user function
  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setState((prev) => ({
      ...prev,
      user: userData,
    }));
  };

  // Context value
  const value = {
    ...state,
    register,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthenContext.Provider value={value}>{children}</AuthenContext.Provider>
  );
};
