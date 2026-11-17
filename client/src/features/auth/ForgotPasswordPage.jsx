import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { forgotPassword } from "../../api/auth";
import { getErrorMessage } from "../../lib/apiClient";
import AuthSplitLayout from "./AuthSplitLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage = () => {
  useDocumentTitle("Forgot password");
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.status === 429 ? "Too many attempts, try again later" : getErrorMessage(err, "Could not send reset email. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      image="/img/mc_engin.jpg"
      quote="Nothing is lost that a good mechanic can't find."
      kicker="Account recovery"
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? undefined : "Enter the email you signed up with and we'll send a reset link."}
      footer={
        <p className="text-center text-sm text-muted">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-fg underline decoration-papaya underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div role="status" className="card-apex flex gap-4 p-5">
          <MailCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted">
            If an account exists for <strong className="text-fg">{email.trim()}</strong>, a reset link is on its way. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor={`${id}-email`} className="label-apex">
              Email
            </label>
            <input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@domain.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-err` : undefined}
              className="field-apex"
            />
            {error && (
              <p id={`${id}-err`} className="mt-1.5 text-xs text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="btn-apex btn-primary-apex w-full">
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ForgotPasswordPage;
