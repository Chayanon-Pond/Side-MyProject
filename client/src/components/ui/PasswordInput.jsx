import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password field with a show/hide toggle. Pass `id` and pair it with a <label htmlFor>. */
const PasswordInput = ({ className = "", ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`field-apex pr-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle hover:text-fg"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
};

export default PasswordInput;
