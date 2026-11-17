import { useState } from "react";
import { Check, Facebook, Link2, Share2, Twitter } from "lucide-react";
import { toast } from "../../../lib/toast";

const LineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.4 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s5.9-3.5 8-6c1.5-1.6 2-3.2 2-4.9C22 6.6 17.5 3 12 3Zm-3.6 10.6H6.4a.5.5 0 0 1-.5-.5V9.2a.5.5 0 1 1 1 0v3.4h1.5a.5.5 0 0 1 0 1Zm1.9-.5a.5.5 0 1 1-1 0V9.2a.5.5 0 1 1 1 0v3.9Zm4.7 0a.5.5 0 0 1-.9.3l-2-2.7v2.4a.5.5 0 1 1-1 0V9.2a.5.5 0 0 1 .9-.3l2 2.7V9.2a.5.5 0 1 1 1 0v3.9Zm3.2-2.5a.5.5 0 0 1 0 1h-1.5v.9h1.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5V9.2c0-.3.2-.5.5-.5h2a.5.5 0 0 1 0 1h-1.5v.9h1.5Z" />
  </svg>
);

/** Web Share API (when available), copy link, X, Facebook, LINE. `vertical` for the sticky rail. */
export default function ShareBar({ title, vertical = false }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title || "");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const btn =
    "inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-fg";
  const links = [
    { label: "Share on X", href: `https://x.com/intent/post?url=${u}&text=${t}`, Icon: Twitter },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { label: "Share on LINE", href: `https://social-plugins.line.me/lineit/share?url=${u}`, Icon: LineIcon },
  ];

  return (
    <div className={`flex gap-2 ${vertical ? "flex-col items-start" : "flex-wrap items-center"}`}>
      {!vertical && <span className="meta mr-2">Share</span>}
      {canShare && (
        <button type="button" className={btn} aria-label="Share…" onClick={() => navigator.share({ title, url }).catch(() => {})}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <button type="button" className={btn} aria-label={copied ? "Link copied" : "Copy link"} onClick={copy}>
        {copied ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
      </button>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={btn}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
