import React from 'react';
import { useNavigate } from 'react-router-dom';

// Reusable BackButton component using navigate(-1)
const BackButton = ({ className = '', children = 'Back', ariaLabel = 'Go back' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {children}
    </button>
  );
};

export default BackButton;
