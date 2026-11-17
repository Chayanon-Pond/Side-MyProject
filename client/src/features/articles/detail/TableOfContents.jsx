import { m } from "motion/react";
import { scrollToTarget } from "../../../lib/smoothScroll";
import { EASE } from "../../../lib/motion";

/** Sticky TOC; the active marker glides between entries (layoutId). */
export default function TableOfContents({ headings, activeId }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="In this article">
      <p className="meta mb-4">In this article</p>
      <ol className="relative space-y-1 border-l border-line">
        {headings.map((h) => {
          const active = h.id === activeId;
          return (
            <li key={h.id} className="relative">
              {active && (
                <m.span
                  layoutId="toc-marker"
                  className="absolute -left-px top-0 h-full w-0.5 bg-papaya"
                  transition={{ duration: 0.3, ease: EASE }}
                  aria-hidden="true"
                />
              )}
              <a
                href={`#${h.id}`}
                aria-current={active ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget(document.getElementById(h.id));
                  history.replaceState(null, "", `#${h.id}`);
                  document.getElementById(h.id)?.focus({ preventScroll: true });
                }}
                className={`block py-1.5 text-sm leading-snug transition-colors duration-150 ${h.level === 3 ? "pl-7" : "pl-4"} ${
                  active ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
