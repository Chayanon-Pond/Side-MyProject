import { m } from "motion/react";
import { Link } from "react-router-dom";
import Wordmark from "../../components/brand/Wordmark";
import { EASE } from "../../lib/motion";

/**
 * Split auth layout: cinematic photograph left (hidden < lg), form column right.
 * `fullHeight` makes it a standalone screen (admin login, no site navbar).
 */
export default function AuthSplitLayout({
  image = "/img/redmc.jpg",
  imageAlt = "",
  quote = "The best drivers are the ones who listen to the car.",
  quoteBy = "APEX road test notes",
  kicker,
  title,
  subtitle,
  children,
  footer,
  fullHeight = false,
}) {
  return (
    <div className={`grid lg:grid-cols-[1.1fr_1fr] ${fullHeight ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}`}>
      <div className="relative hidden overflow-hidden bg-[#0b0b0c] lg:block">
        <m.img
          src={image}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1.02, opacity: 0.9 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/30 to-[#0b0b0c]/40" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-10 text-[#f2f2f0]">
          {/* Inside the site shell the navbar already shows the wordmark: one logo per page. */}
          {fullHeight ? (
            <Link to="/" aria-label="APEX — home" className="w-fit">
              <Wordmark className="h-6 w-auto" />
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <m.blockquote
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
            className="max-w-md"
          >
            <p className="font-display text-3xl font-bold leading-tight">“{quote}”</p>
            <footer className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-[#a1a1a8]">— {quoteBy}</footer>
          </m.blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <m.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {fullHeight && (
            <Link to="/" aria-label="APEX — home" className="mb-10 inline-block lg:hidden">
              <Wordmark className="h-6 w-auto" />
            </Link>
          )}
          {kicker && <p className="kicker mb-3">{kicker}</p>}
          {title && <h1 className="font-expanded text-3xl font-extrabold leading-tight tracking-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8">{footer}</div>}
        </m.div>
      </div>
    </div>
  );
}
