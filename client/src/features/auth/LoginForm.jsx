import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import PasswordInput from "../../components/ui/PasswordInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared email/password form for both user and admin login.
 * @param {{ requireAdmin?: boolean, onSuccess: (user) => void, showForgotLink?: boolean }} props
 */
const LoginForm = ({ requireAdmin = false, onSuccess, showForgotLink = true, prefill }) => {
  const { login, loading } = useAuth();
  const id = useId();
  const [form, setForm] = useState({ email: "", password: "" });

  // "Use this" on the demo-access card fills the form.
  const [lastPrefill, setLastPrefill] = useState(prefill);
  if (prefill && prefill !== lastPrefill) {
    setLastPrefill(prefill);
    setForm({ email: prefill.email, password: prefill.password });
  }
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.submit) setErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email address";
    if (!form.password) next.password = "Password is required";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    const result = await login(form.email.trim(), form.password, { requireAdmin });
    if (result.success) onSuccess?.(result.user);
    else setErrors({ submit: result.error });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor={`${id}-email`} className="label-apex">
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${id}-email-err` : undefined}
          className="field-apex"
        />
        {errors.email && (
          <p id={`${id}-email-err`} className="mt-1.5 text-xs text-danger">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-password`} className="label-apex">
          Password
        </label>
        <PasswordInput
          id={`${id}-password`}
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? `${id}-password-err` : undefined}
        />
        {errors.password && (
          <p id={`${id}-password-err`} className="mt-1.5 text-xs text-danger">
            {errors.password}
          </p>
        )}
      </div>

      {showForgotLink && (
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-fg">
            Forgot password?
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-apex btn-primary-apex w-full"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {errors.submit && (
        <p className="rounded-[2px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {errors.submit}
        </p>
      )}
    </form>
  );
};

export default LoginForm;
