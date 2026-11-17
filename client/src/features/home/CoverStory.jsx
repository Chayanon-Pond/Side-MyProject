import { useEffect, useRef } from "react";
import { heroProgress, useScrollProgress } from "../../hooks/useScrollProgress";
import { prefersReducedMotion } from "../../lib/motion";
import { releaseBootHero } from "../../lib/bootHero";
import { Link, useViewTransitionState } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MaskedHeadline from "../../components/motion/MaskedHeadline";
import Avatar from "../../components/ui/Avatar";
import { coverOf, responsiveImage } from "../../lib/image";
import { imgFallback } from "../../lib/assets";
import { formatDate } from "../../lib/format";
import { kickerOf } from "../../api/normalize";
import { articlePath } from "../articles/paths";
import { previewOf } from "../articles/preview";

/** Delay for the CSS entrance (index.css `.anim-rise`): runs from the first paint, no JS per frame. */
const delay = (d) => ({ "--d": `${d}s` });

/** 90vh full-bleed cover: slow Ken Burns, scroll parallax, masked headline, staggered kicker/meta. */
export default function CoverStory({ article }) {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const textRef = useRef(null);
  // Parallax + fade while the cover scrolls away (measured only on scroll, styles written directly).
  useScrollProgress(
    ref,
    heroProgress,
    (p) => {
      if (layerRef.current) layerRef.current.style.transform = `translate3d(0, ${(p * 18).toFixed(2)}%, 0)`;
      if (textRef.current) textRef.current.style.opacity = String(Math.max(0, 1 - p / 0.7));
    },
    { enabled: !prefersReducedMotion() }
  );
  const to = articlePath(article);
  const morphing = useViewTransitionState(to);
  const cover = coverOf(article);
  const imgRef = useRef(null);
  // Same src/srcset/sizes as the <link rel=preload> the boot script in index.html adds.
  const { src, srcSet } = responsiveImage(cover.path, { base: 1920, fallback: cover.fallback });
  // The boot script's early copy of this photo (#boot-hero) goes away once ours is on screen.
  useEffect(() => {
    if (imgRef.current?.complete) releaseBootHero();
  }, [src]);

  return (
    <section ref={ref} className="relative isolate h-[90vh] min-h-[560px] overflow-hidden bg-[#0b0b0c] text-hero" aria-label="Cover story">
      <div ref={layerRef} className="absolute inset-0 -z-10 will-change-transform">
        <img
          src={src}
          srcSet={srcSet}
          sizes="100vw"
          alt={cover.alt}
          fetchPriority="high"
          loading="eager"
          ref={imgRef}
          onLoad={releaseBootHero}
          onError={(e) => {
            releaseBootHero();
            imgFallback(cover.fallback)(e);
          }}
          // Ken Burns as a CSS transform animation: the LCP image is visible from its first paint
          // (no opacity fade) and the 14 s zoom costs no main-thread work.
          className="anim-kenburns h-full w-full object-cover"
          style={{
            "--kb-from": 1.14,
            "--kb-to": 1.04,
            "--kb-dur": "14s",
            ...(morphing ? { viewTransitionName: "article-hero" } : null),
          }}
        />
      </div>
      <div className="hero-gradient absolute inset-0 -z-10" aria-hidden="true" />

      <div ref={textRef} className="shell flex h-full flex-col justify-end pb-14 md:pb-20">
        <p style={delay(0.05)} className="anim-rise font-mono text-xs uppercase tracking-[0.18em] text-[#ff7a2b]">
          Cover story · {kickerOf(article)}
        </p>
        <Link to={to} viewTransition state={{ preview: previewOf(article) }} className="group mt-4 block max-w-5xl">
          <MaskedHeadline
            as="h1"
            text={article.title}
            className="font-expanded text-[clamp(44px,7vw,96px)] font-extrabold leading-[0.95] tracking-[-0.02em]"
          />
        </Link>
        {article.dek && (
          <p style={delay(0.45)} className="anim-rise mt-6 max-w-2xl font-serif text-xl leading-snug text-[#d6d6d2] md:text-2xl">
            {article.dek}
          </p>
        )}
        <div style={delay(0.6)} className="anim-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-3">
            <Avatar src={article.author_avatar_url} name={article.author_name} size={36} className="!border-white/20 !bg-white/10 !text-white/80" />
            <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#c9c9c4]">
              <p className="text-[#f2f2f0]">{article.author_name}</p>
              <p>
                {formatDate(article.published_at)}
                {article.reading_time_min ? ` · ${article.reading_time_min} min read` : ""}
              </p>
            </div>
          </div>
          <Link
            to={to}
            viewTransition
            state={{ preview: previewOf(article) }}
            className="btn-apex btn-primary-apex group/cta"
          >
            Read the story
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* CSS-only cue (index.css): an endless JS-driven animation would keep the main thread busy. */}
      <div
        className="anim-fade pointer-events-none absolute bottom-6 right-6 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 md:block"
        style={{ "--d": "1.2s" }}
        aria-hidden="true"
      >
        Scroll
        <span className="scroll-cue mx-auto mt-2 block h-8 w-px origin-top bg-white/50" />
      </div>
    </section>
  );
}

export function CoverSkeleton() {
  return (
    <section className="relative h-[90vh] min-h-[560px] bg-[#0b0b0c]" aria-busy="true" aria-label="Loading cover story">
      <div className="shell flex h-full flex-col justify-end gap-4 pb-20">
        <div className="h-3 w-40 animate-pulse rounded-[2px] bg-white/10" />
        <div className="h-16 w-4/5 animate-pulse rounded-[2px] bg-white/10" />
        <div className="h-16 w-3/5 animate-pulse rounded-[2px] bg-white/10" />
        <div className="h-5 w-1/2 animate-pulse rounded-[2px] bg-white/10" />
      </div>
    </section>
  );
}
