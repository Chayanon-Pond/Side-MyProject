import { useState } from "react";
import { assetUrl } from "../../lib/assets";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "A";

/** Round avatar with an initials fallback (no broken-image icons, ever). */
export default function Avatar({ src, name = "", size = 36, className = "" }) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? assetUrl(src) : null;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 font-display font-semibold text-muted ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" width={size} height={size} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
