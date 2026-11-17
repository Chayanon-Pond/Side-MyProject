import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Goes back in history, or to `fallback` when there is no history (e.g. opened from a shared link). */
const BackButton = ({ className = "", children = "Back", fallback = "/" }) => {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1, { viewTransition: true });
    else navigate(fallback, { viewTransition: true });
  };
  return (
    <button
      type="button"
      onClick={goBack}
      className={`group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg ${className}`}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
      {children}
    </button>
  );
};

export default BackButton;
