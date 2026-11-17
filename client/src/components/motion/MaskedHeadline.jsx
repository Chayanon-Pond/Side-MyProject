import { Fragment } from "react";

/**
 * Masked line-by-line reveal: every word rises out of its own clip, staggered, so wrapped
 * lines read as sequential reveals at any viewport width. Screen readers get the plain text.
 * Pure CSS (`.anim-word` in index.css): it starts with the first paint and costs no JS per frame,
 * which matters because this headline sits on top of the LCP hero image.
 */
export default function MaskedHeadline({ as = "h1", text = "", className = "", delay = 0.1, step = 0.045 }) {
  const Tag = as;
  const words = String(text).split(/\s+/).filter(Boolean);
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <span className="anim-word" style={{ "--d": `${(delay + i * step).toFixed(3)}s` }}>
                {w}
              </span>
            </span>
            {/* The space lives outside the inline-blocks: trailing spaces inside one collapse away. */}
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
