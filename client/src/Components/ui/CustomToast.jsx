import React from "react";
import { toast } from "sonner";

export const useCustomToast = () => {
  // Success Toast
  const showSuccess = (message, description = "") => {
    toast.success(message, {
      description,
      duration: 4000,
      position: "top-right",
      style: {
        background: "#10B981",
        color: "white",
        border: "none",
      },
      className: "custom-toast-success",
      icon: "✅",
    });
  };

  // Error Toast
  const showError = (message, description = "") => {
    toast.error(message, {
      description,
      duration: 5000,
      position: "top-right",
      style: {
        background: "#EF4444",
        color: "white",
        border: "none",
      },
      className: "custom-toast-error",
      icon: "❌",
    });
  };

  // Warning Toast
  const showWarning = (message, description = "") => {
    toast.warning(message, {
      description,
      duration: 4000,
      position: "top-right",
      style: {
        background: "#F59E0B",
        color: "white",
        border: "none",
      },
      className: "custom-toast-warning",
      icon: "⚠️",
    });
  };

  // Info Toast
  const showInfo = (message, description = "") => {
    toast.info(message, {
      description,
      duration: 4000,
      position: "top-right",
      style: {
        background: "#3B82F6",
        color: "white",
        border: "none",
      },
      className: "custom-toast-info",
      icon: "ℹ️",
    });
  };

  // Loading Toast (returns a function to dismiss)
  const showLoading = (message) => {
    const toastId = toast.loading(message, {
      position: "top-right",
      style: {
        background: "#6B7280",
        color: "white",
        border: "none",
      },
      className: "custom-toast-loading",
    });

    return toastId;
  };

  // Promise Toast - for async operations
  const showPromise = (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || "Loading...",
      success: (data) => messages.success || "Success!",
      error: (error) => messages.error || "Error occurred!",
      position: "top-right",
    });
  };

  // Custom Toast with Action Button
  const showWithAction = (message, actionLabel, onAction) => {
    toast(message, {
      position: "top-right",
      duration: 6000,
      action: {
        label: actionLabel,
        onClick: onAction,
      },
    });
  };

  // Dismiss specific toast
  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  // Dismiss all toasts
  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    promise: showPromise,
    withAction: showWithAction,
    dismiss,
    dismissAll,
  };
};
