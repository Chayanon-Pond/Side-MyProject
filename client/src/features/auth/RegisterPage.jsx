import { useId, useState } from "react";
import { m } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import { Check } from "lucide-react";
import { useAuth } from "./AuthContext";
import AuthSplitLayout from "./AuthSplitLayout";
import PasswordInput from "../../components/ui/PasswordInput";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { EASE } from "../../lib/motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELDS = [
  { name: "fullName", label: "Full name", placeholder: "Alex Driver", type: "text", autoComplete: "name" },
  { name: "username", label: "Username", placeholder: "alexdrives", type: "text", autoComplete: "username" },
  { name: "email", label: "Email", placeholder: "you@domain.com", type: "email", autoComplete: "email" },
];

const RULES = [
  { test: (p) => p.length >= 8, label: "8+ characters" },
  { test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p), label: "Upper & lower case" },
  { test: (p) => /\d/.test(p), label: "A number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: "A symbol" },
];
const STRENGTH = [
  { label: "Too short", color: "var(--danger)" },
  { label: "Weak", color: "var(--danger)" },
  { label: "Fair", color: "var(--warning)" },
  { label: "Good", color: "var(--data)" },
  { label: "Strong", color: "var(--success)" },
];

const validateField = (name, value) => {
  const v = value.trim();
  if (name === "fullName") return v ? "" : "Tell us your name";
  if (name === "username") return v.length >= 2 ? "" : "At least 2 characters";
  if (name === "email") return !v ? "Email is required" : EMAIL_RE.test(v) ? "" : "That doesn't look like an email";
  if (name === "password") return value.length >= 6 ? "" : "At least 6 characters";
  return "";
};

function StrengthMeter({ password }) {
  const passed = RULES.filter((r) => r.test(password)).length;
  const level = password.length < 6 ? 0 : Math.max(1, passed);
  const s = STRENGTH[level];
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-[1px] bg-surface-2">
            <m.div
              className="h-full"
              initial={false}
              animate={{ scaleX: level >= i ? 1 : 0, backgroundColor: s.color }}
              style={{ originX: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium" style={{ color: password ? s.color : "var(--subtle)" }}>
          {password ? `Strength: ${s.label}` : "Use a passphrase you don't use elsewhere"}
        </span>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-subtle">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={`inline-flex items-center gap-1 ${ok ? "text-ok" : ""}`}>
                <Check className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-30"}`} aria-hidden="true" />
                {r.label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const RegisterPage = () => {
  useDocumentTitle("Create account");
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState("");

  const errors = Object.fromEntries(Object.keys(form).map((k) => [k, validateField(k, form[k])]));
  const show = (k) => touched[k] && errors[k];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setTouched({ fullName: true, username: true, email: true, password: true });
    if (Object.values(errors).some(Boolean)) return;
    const result = await register({
      ...form,
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
    });
    if (result.success) {
      toast.success("Account created", { description: "Sign in with your new account." });
      navigate("/login");
    } else setSubmitError(result.error);
  };

  return (
    <AuthSplitLayout
      image="/img/urus.jpg"
      quote="Every great drive starts with somebody saying: let's take the long way."
      kicker="Join APEX"
      title="Create your account"
      subtitle="Free, forever. Comment, follow makes and get the weekly newsletter."
      footer={
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-fg underline decoration-papaya underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`${id}-${f.name}`} className="label-apex">
              {f.label}
            </label>
            <input
              id={`${id}-${f.name}`}
              type={f.type}
              name={f.name}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={form[f.name]}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, [f.name]: true }))}
              aria-invalid={Boolean(show(f.name))}
              aria-describedby={show(f.name) ? `${id}-${f.name}-err` : undefined}
              className="field-apex"
            />
            {show(f.name) && (
              <p id={`${id}-${f.name}-err`} className="mt-1.5 text-xs text-danger">
                {errors[f.name]}
              </p>
            )}
          </div>
        ))}

        <div>
          <label htmlFor={`${id}-password`} className="label-apex">
            Password
          </label>
          <PasswordInput
            id={`${id}-password`}
            name="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            aria-invalid={Boolean(show("password"))}
            aria-describedby={show("password") ? `${id}-password-err` : undefined}
          />
          {show("password") && (
            <p id={`${id}-password-err`} className="mt-1.5 text-xs text-danger">
              {errors.password}
            </p>
          )}
          <StrengthMeter password={form.password} />
        </div>

        <button type="submit" disabled={loading} className="btn-apex btn-primary-apex w-full">
          {loading ? "Creating account…" : "Create account"}
        </button>

        {submitError && (
          <p className="rounded-[2px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </AuthSplitLayout>
  );
};

export default RegisterPage;
