import { lazy, Suspense, useState } from "react";
import { m } from "motion/react";
import { Images } from "lucide-react";
import { responsiveImage } from "../../../lib/image";
import { RevealGroup, RevealItem } from "../../../components/motion/Reveal";

const Lightbox = lazy(() => import("./Lightbox"));

/** Gallery strip; opening a frame zooms it into the lightbox (shared layoutId). */
export default function GalleryStrip({ items }) {
  const [index, setIndex] = useState(null);
  const [opened, setOpened] = useState(false);
  if (!items?.length) return null;

  return (
    <section className="mt-16" aria-labelledby="gallery-title">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="gallery-title" className="flex items-center gap-2 font-display text-xl font-bold">
          <Images className="h-5 w-5 text-papaya-ink" aria-hidden="true" /> Gallery
        </h2>
        <span className="meta">{String(items.length).padStart(2, "0")} frames</span>
      </div>
      <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((g, i) => {
          const { src } = responsiveImage(g.url, { base: 640 });
          return (
            <RevealItem key={`${g.url}-${i}`} className={i === 0 && items.length > 2 ? "col-span-2 row-span-2" : ""}>
              <button
                type="button"
                onClick={() => {
                  setOpened(true);
                  setIndex(i);
                }}
                className="group relative block h-full w-full overflow-hidden rounded-[6px] bg-surface-2"
                style={{ aspectRatio: i === 0 && items.length > 2 ? "4 / 3" : "4 / 3" }}
                aria-label={`Open image ${i + 1} of ${items.length}${g.caption ? `: ${g.caption}` : ""}`}
              >
                {index !== i && (
                  <m.img
                    layoutId={`gallery-${i}`}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="zoom-img absolute inset-0 h-full w-full object-cover"
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                )}
              </button>
            </RevealItem>
          );
        })}
      </RevealGroup>
      {opened && (
        <Suspense fallback={null}>
          <Lightbox items={items} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
        </Suspense>
      )}
    </section>
  );
}
