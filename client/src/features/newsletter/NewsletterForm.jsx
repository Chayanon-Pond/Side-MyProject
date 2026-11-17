import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeNewsletter } from "../../api/discovery";
import { getErrorMessage } from "../../lib/apiClient";
import { EASE } from "../../lib/motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email capture → POST /api/newsletter. Inline validation; 429 gets a friendly message. */
export default function NewsletterForm({ compact = false, className = "" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | busy | done | error
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (status === "busy") return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("busy");
    setMessage("");
    try {
      await subscribeNewsletter(value);
      setStatus("done");
      setMessage("You're on the list. First issue lands Friday.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err?.status === 429
          ? "Too many attempts — try again in a few minutes."
          : err?.status === 404
            ? "Newsletter sign-up opens soon."
            : getErrorMessage(err, "Couldn't subscribe right now.")
      );
    }
  };

  return (
    <form onSubmit={submit} noValidate className={className}>
      <label htmlFor={`${id}-email`} className={compact ? "sr-only" : "label-apex"}>
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-invalid={status === "error"}
          aria-describedby={`${id}-msg`}
          disabled={status === "done"}
          className="field-apex min-w-0 flex-1"
        />
        <button type="submit" disabled={status === "busy" || status === "done"} className="btn-apex btn-primary-apex shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={status === "done" ? "done" : "go"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              {status === "done" ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" /> Subscribed
                </>
              ) : (
                <>
                  {status === "busy" ? "Subscribing…" : "Subscribe"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </m.span>
          </AnimatePresence>
        </button>
      </div>
      <p
        id={`${id}-msg`}
        role={status === "error" ? "alert" : "status"}
        className={`mt-2 min-h-5 text-sm ${status === "error" ? "text-danger" : "text-muted"}`}
      >
        {message}
      </p>
    </form>
  );
}
