import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

/**
 * Demo credentials are shown ON PURPOSE (portfolio demo — owner decision).
 * `onUse` (optional) fills the login form with the account.
 */
export default function DemoAccessCard({ accounts, onUse, className = "" }) {
  const [copied, setCopied] = useState(null);
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // clipboard blocked: the value is visible anyway
    }
  };

  return (
    <aside className={`rounded-[6px] border border-dashed border-line-strong bg-surface p-4 ${className}`} aria-label="Demo access">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-papaya-ink" aria-hidden="true" />
        <p className="kicker">Demo access</p>
      </div>
      <ul className="space-y-3">
        {accounts.map((acc) => (
          <li key={acc.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="w-full text-xs text-subtle">{acc.label}</span>
            {[
              ["Email", acc.email],
              ["Password", acc.password],
            ].map(([label, value]) => (
              <button
                key={label}
                type="button"
                onClick={() => copy(value, `${acc.email}-${label}`)}
                className="group inline-flex items-center gap-1.5 rounded-[2px] bg-surface-2 px-2 py-1 font-mono text-[13px] text-fg"
                aria-label={`Copy ${label.toLowerCase()} ${value}`}
              >
                {value}
                {copied === `${acc.email}-${label}` ? (
                  <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-subtle group-hover:text-fg" aria-hidden="true" />
                )}
              </button>
            ))}
            {onUse && (
              <button type="button" onClick={() => onUse(acc)} className="ml-auto text-xs font-semibold text-papaya-ink hover:underline">
                Use this
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
