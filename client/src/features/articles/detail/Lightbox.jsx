import { useEffect, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { responsiveImage } from "../../../lib/image";
import { lockScroll } from "../../../lib/smoothScroll";
import { EASE } from "../../../lib/motion";

/**
 * Fullscreen gallery: shared-element zoom from the strip (layoutId), arrow keys, swipe/drag,
 * thumbnail scrubber, Esc to close, focus kept inside and restored on close.
 */
export default function Lightbox({ items, index, onIndex, onClose }) {
  const open = index !== null && index !== undefined;
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const thumbsRef = useRef(null);
  const n = items.length;
  const go = (d) => onIndex((i) => (i + d + n) % n);

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    lockScroll(true);
    const t = setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((i) => (i + 1) % n);
      else if (e.key === "ArrowLeft") onIndex((i) => (i - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n, onClose, onIndex]);

  useEffect(() => {
    if (!open) return;
    thumbsRef.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [open, index]);

  const item = open ? items[index] : null;
  const { src } = item ? responsiveImage(item.url, { base: 1920 }) : { src: "" };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${index + 1} of ${n}`}
          className="fixed inset-0 z-[95] flex flex-col bg-[#0b0b0c]/96 text-[#f2f2f0] backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          data-lenis-prevent
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8">
            <span className="font-mono text-xs tracking-[0.14em] text-[#a1a1a8]">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close gallery"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20">
            <m.img
              key={index}
              layoutId={`gallery-${index}`}
              src={src}
              alt={item.caption || ""}
              className="max-h-full max-w-full cursor-grab touch-pan-y select-none rounded-[2px] object-contain active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -400) go(1);
                else if (info.offset.x > 80 || info.velocity.x > 400) go(-1);
              }}
              transition={{ duration: 0.5, ease: EASE }}
              draggable={false}
            />
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 hover:bg-black/70 md:flex"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 hover:bg-black/70 md:flex"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          <div className="shrink-0 px-4 pb-4 pt-3 md:px-8">
            <p className="min-h-10 max-w-3xl text-sm text-[#d6d6d2]" aria-live="polite">
              {item.caption}
              {item.credit && <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#8a8a92]">© {item.credit}</span>}
            </p>
            {n > 1 && (
              <div ref={thumbsRef} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Gallery thumbnails">
                {items.map((g, i) => (
                  <button
                    key={`${g.url}-${i}`}
                    data-i={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Image ${i + 1}`}
                    onClick={() => onIndex(i)}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-[2px] transition-opacity duration-150 ${
                      i === index ? "opacity-100" : "opacity-45 hover:opacity-80"
                    }`}
                  >
                    <img src={responsiveImage(g.url, { base: 200 }).src} alt="" className="h-full w-full object-cover" />
                    {i === index && <m.span layoutId="lb-thumb" className="absolute inset-0 border-2 border-[#ff6a13]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
