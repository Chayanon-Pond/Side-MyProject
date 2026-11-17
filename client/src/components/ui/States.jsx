import { AlertTriangle, Inbox } from "lucide-react";

export const Spinner = ({ label = "Loading…", className = "py-16" }) => (
  <div className={`flex items-center justify-center ${className}`} role="status" aria-live="polite">
    <span className="relative h-8 w-8" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border border-line" />
      <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-papaya" />
    </span>
    <span className="sr-only">{label}</span>
  </div>
);

export const ErrorState = ({ title = "Something went wrong", message, onRetry }) => (
  <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
    <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-danger" aria-hidden="true" />
    <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
    {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn-apex btn-ghost-apex mt-6">
        Try again
      </button>
    )}
  </div>
);

export const EmptyState = ({ title = "Nothing here yet", message, children, icon: Icon = Inbox }) => (
  <div className="mx-auto max-w-md px-4 py-16 text-center">
    <Icon className="mx-auto mb-4 h-8 w-8 text-subtle" aria-hidden="true" />
    <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
    {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    {children}
  </div>
);

/** Shimmer block. Pass Tailwind sizing classes. */
export const Skeleton = ({ className = "", style }) => <div className={`shimmer ${className}`} style={style} aria-hidden="true" />;

/** Skeleton shaped exactly like ArticleCard (image ratio + kicker + 2 title lines + meta). */
export const CardSkeleton = ({ ratio = "4 / 3", lines = 2 }) => (
  <div aria-hidden="true">
    <Skeleton className="w-full !rounded-[6px]" style={{ aspectRatio: ratio }} />
    <Skeleton className="mt-4 h-3 w-24" />
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} className={`mt-3 h-5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
    ))}
    <Skeleton className="mt-4 h-3 w-32" />
  </div>
);
