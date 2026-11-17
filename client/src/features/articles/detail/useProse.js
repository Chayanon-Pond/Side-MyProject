import { useEffect, useState } from "react";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "section";

/**
 * After the sanitized body is in the DOM:
 *  - give h2/h3 stable ids and return them for the TOC,
 *  - track the active heading,
 *  - reveal figures/images (fade + lift) and pull quotes (slide in) as they enter the viewport.
 */
export function useProse(containerRef, html) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;

    const used = new Set();
    const hs = [...root.querySelectorAll("h2, h3")].map((el) => {
      let id = el.id || slugify(el.textContent || "");
      while (used.has(id)) id += "-x";
      used.add(id);
      el.id = id;
      el.tabIndex = -1;
      return { id, text: el.textContent.trim(), level: el.tagName === "H3" ? 3 : 2, el };
    });
    setHeadings(hs.map(({ el: _el, ...h }) => h));
    setActiveId(hs[0]?.id ?? null);

    const headingObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );
    hs.forEach((h) => headingObserver.observe(h.el));

    const revealTargets = root.querySelectorAll(":scope > figure, :scope > img, :scope > p > img, :scope > iframe, .pull-quote");
    revealTargets.forEach((el) => el.classList.add("reveal-pending"));
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            revealObserver.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));

    return () => {
      headingObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [containerRef, html]);

  return { headings, activeId };
}
