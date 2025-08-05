import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authentication";
import NotificationDropdown from "./ui/NotificationDropdown";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="md:flex md:justify-between md:mx-auto shadow-sm flex justify-between bg-[#1c1c1c] md:items-center w-full sticky top-0 z-50">
        <div className="md:ml-1 ml-1 h-28">
          <Link to="/">
            <img
              className="h-28"
              src="/logo/Porsche_car_logo.png"
              alt="logo"
            />
          </Link>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex gap-4">
          <div className="mx-auto md:pl-120 mr-20 mt-3">
            <ul className="flex flex-col md:flex-row md:gap-10 gap-2">
              <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
                <Link to="/" className="block">Home</Link>
              </li>
              <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
                About
              </li>
              <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
                Contact
              </li>
              <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
                Help
              </li>
            </ul>
          </div>
        
        {/* Desktop Auth Buttons */}
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
      
      {/* Mobile Hamburger Button */}
      <div className="flex md:hidden items-center justify-center">
        <button
          onClick={toggleMobileMenu}
          className="md:mr-10 mr-10 p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
          type="button"
          aria-label="Toggle mobile menu"
        >
          <svg 
            className={`w-6 h-6 transition-transform ${isMobileMenuOpen ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
    </nav>

    {/* Mobile Menu Overlay */}
    {isMobileMenuOpen && (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}></div>
        <div className="md:hidden fixed top-28 left-0 right-0 bg-[#1c1c1c] border-t border-gray-600 z-50 shadow-lg">
          <div className="px-4 py-6 space-y-4">
            {/* Mobile Navigation Links */}
            <div className="space-y-3">
              <Link 
                to="/" 
                className="block text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <button className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                About
              </button>
              <button className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                Contact
              </button>
              <button className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                Help
              </button>
            </div>

            <hr className="border-gray-600" />

            {/* Mobile Auth Section */}
            {user ? (
              <div className="space-y-3">
                {/* Mobile User Info */}
                <div className="flex items-center space-x-3 py-2 px-4">
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center overflow-hidden">
                    <img
                      src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
                      alt={user.full_name || user.fullName || user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-white">
                    <p className="font-medium">{user.full_name || user.fullName || user.name}</p>
                    <p className="text-sm text-gray-300">{user.email}</p>
                  </div>
                </div>

                {/* Mobile Notification */}
                <div className="px-4">
                  <NotificationDropdown />
                </div>

                {/* Mobile User Menu */}
                <button
                  onClick={() => {
                    closeMobileMenu();
                    navigate("/profile");
                  }}
                  className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Profile
                </button>

                <button
                  onClick={() => {
                    closeMobileMenu();
                    navigate("/reset-password");
                  }}
                  className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset Password
                </button>

                {(user.role === "admin" || user.is_admin) && (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/admin");
                    }}
                    className="block w-full text-left text-white hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Admin Panel
                  </button>
                )}

                <hr className="border-gray-600" />

                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-red-400 hover:text-red-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link 
                  to="/login"
                  className="block w-full text-center bg-white text-black py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  onClick={closeMobileMenu}
                >
                  Log in
                </Link>
                <Link 
                  to="/register"
                  className="block w-full text-center border border-white text-white py-3 px-4 rounded-lg hover:bg-white hover:text-black transition-colors font-medium"
                  onClick={closeMobileMenu}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </>
  );
};

export default Navbar;
