import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authentication";
import NotificationDropdown from "./ui/NotificationDropdown";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate("/");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="md:flex md:justify-between md:mx-auto shadow-sm flex justify-between bg-[#1c1c1c] md:items-center w-full sticky top-0">
      <div className="md:ml-1 ml-1 h-28">
        <Link to="/">
          <img
            className="h-28"
            src="/logo/Porsche_car_logo.png"
            alt="logo"
          />
        </Link>
      </div>
      
      <div className="hidden md:flex gap-4">
        <div className="mx-auto md:pl-120 mr-20 mt-3">
          <ul className="flex flex-col md:flex-row md:gap-10 gap-2">
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
              Home
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
              About
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
              contact
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
              Help
            </li>
          </ul>
        </div>
        
        {user ? (
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <NotificationDropdown />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center space-x-2 text-white hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
                    alt={user.full_name || user.fullName || user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium max-w-24 truncate">
                  {user.full_name || user.fullName || user.name}
                </span>
                <svg
                  className={isDropdownOpen ? "w-4 h-4 transition-transform rotate-180" : "w-4 h-4 transition-transform"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={closeDropdown}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20">
                    <button
                      onClick={() => {
                        closeDropdown();
                        navigate("/profile");
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        closeDropdown();
                        navigate("/reset-password");
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"
                        />
                      </svg>
                      Reset password
                    </button>

                    {(user.role === "admin" || user.is_admin) && (
                      <button
                        onClick={() => {
                          closeDropdown();
                          navigate("/admin");
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Admin panel
                      </button>
                    )}

                    <hr className="my-2 border-gray-200" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button className="w-[127px] h-[48px] bg-black text-white border px-4 py-2 hover:bg-gray-800 mr-2 md:rounded-3xl hover:shadow-md cursor-pointer">
              <Link to="/login">Log in</Link>
            </button>
            <button className="w-[127px] h-[48px] bg-black text-white border px-4 py-2 hover:bg-gray-800 md:mr-10 md:rounded-3xl hover:shadow-md cursor-pointer">
              <Link to="/register">Sign up</Link>
            </button>
          </div>
        )}
      </div>
      
      <div className="flex md:hidden items-center justify-center">
        <button
          className="md:mr-10 mr-10"
          data-collapse-toggle="navbar-hamburger"
          type="button"
        >
          <img src="/logo/hamberger.svg" alt="hamburger menu" />
        </button>
      </div>
      
      <script src="https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js"></script>
    </nav>
  );
};

export default Navbar;
