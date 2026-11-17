import { useEffect, useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "../../lib/toast";
import { resetPasswordWithToken } from "../../api/auth";
import { getErrorMessage } from "../../lib/apiClient";
import PasswordInput from "../../components/ui/PasswordInput";
import AuthSplitLayout from "./AuthSplitLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

/** /reset-password/:token – set a new password from the emailed link. */
const ResetPasswordTokenPage = () => {
  useDocumentTitle("Reset password");
  const { token } = useParams();
  const navigate = useNavigate();
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => navigate("/login", { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setSubmitting(true);
    setError("");
    try {
      await resetPasswordWithToken(token, password);
      toast.success("Password updated", { description: "You can now sign in with your new password." });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      image="/img/redmc.jpg"
      kicker="Account recovery"
      title="Choose a new password"
      footer={
        // After a successful reset the "Link expired?" hint is noise: only offer it with the form.
        !done && (
          <p className="text-center text-sm text-muted">
            Link expired?{" "}
            <Link to="/forgot-password" className="font-semibold text-fg underline decoration-papaya underline-offset-4">
              Request a new one
            </Link>
          </p>
        )
      }
    >
      {done ? (
        <p role="status" className="card-apex p-5 text-sm text-muted">
          Your password has been reset. Taking you to{" "}
          <Link to="/login" className="text-fg underline">
            sign in
          </Link>
          …
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor={`${id}-new`} className="label-apex">
              New password
            </label>
            <PasswordInput id={`${id}-new`} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-confirm`} className="label-apex">
              Confirm new password
            </label>
            <PasswordInput id={`${id}-confirm`} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-[2px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-apex btn-primary-apex w-full">
            {submitting ? "Saving…" : "Reset password"}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ResetPasswordTokenPage;
